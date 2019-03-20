import * as React from 'react';
import { ReactReduxContext } from 'react-redux';
import { FixtureContext } from 'react-cosmos-fixture';
import { Store } from 'redux';

type Props<ReduxState extends object> = {
  children: React.ReactNode;
  configureStore: (state: Partial<ReduxState>) => Store<ReduxState>;
  initialState?: Partial<ReduxState>;
};

export function ReduxMock<ReduxState extends object>({
  children,
  configureStore,
  initialState
}: Props<ReduxState>) {
  const { fixtureState, setFixtureState } = React.useContext(FixtureContext);

  // Create Redux context state
  const [reduxContext, setReduxContext] = React.useState(() => {
    const state = fixtureState.redux ? fixtureState.redux.state : initialState;
    const store = configureStore(state);
    return {
      changedAt: getTime(),
      storeState: store.getState(),
      store
    };
  });

  // Subscribe to Redux store changes
  const { store } = reduxContext;
  React.useEffect(
    () =>
      store.subscribe(() => {
        setReduxContext({
          changedAt: getTime(),
          storeState: store.getState(),
          store
        });
      }),
    [store, setReduxContext]
  );

  // Synchronize fixture state with local Redux state
  const { changedAt, storeState } = reduxContext;
  React.useEffect(() => {
    setFixtureState(fixtureState => ({
      ...fixtureState,
      redux: {
        changedAt,
        state: storeState
      }
    }));
  }, [changedAt, storeState, setFixtureState]);

  // Override local Redux state when fixture changed by other client
  React.useEffect(() => {
    if (!fixtureState.redux) {
      return;
    }

    const { changedAt, state } = fixtureState.redux;
    if (changedAt > reduxContext.changedAt) {
      const store = configureStore(state);
      setReduxContext({
        changedAt,
        storeState: store.getState(),
        store
      });
    }
  }, [
    fixtureState.redux,
    reduxContext.changedAt,
    configureStore,
    setReduxContext
  ]);

  return (
    <ReactReduxContext.Provider value={reduxContext}>
      {children}
    </ReactReduxContext.Provider>
  );
}

ReduxMock.cosmosCapture = false;

function getTime() {
  return Date.now();
}
