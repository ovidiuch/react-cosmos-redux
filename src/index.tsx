import * as React from 'react';
import { FixtureContext } from 'react-cosmos/fixture';
import { Provider } from 'react-redux';
import { Store } from 'redux';

type Props<ReduxState extends object> = {
  children: React.ReactNode;
  configureStore: (state: ReduxState | undefined) => Store<ReduxState>;
  initialState?: ReduxState;
};

type ReduxFixtureState<ReduxState extends object> = {
  changedAt: number;
  state: ReduxState;
};

export function ReduxMock<ReduxState extends object = any>({
  children,
  configureStore,
  initialState,
}: Props<ReduxState>) {
  const { fixtureState, setFixtureState } = React.useContext(FixtureContext);

  // Create Redux context state
  const [state, setState] = React.useState(() => {
    const reduxFs = fixtureState.redux as ReduxFixtureState<ReduxState>;
    const reduxState = reduxFs ? reduxFs.state : initialState;
    const store = configureStore(reduxState);
    return {
      changedAt: getTime(),
      store,
    };
  });

  // Subscribe to Redux store
  const { store } = state;
  React.useEffect(
    () =>
      store.subscribe(() => {
        setState({
          changedAt: getTime(),
          store,
        });
      }),
    [store, setState]
  );

  // Synchronize fixture state with local Redux state
  React.useEffect(() => {
    setFixtureState(fixtureState => ({
      ...fixtureState,
      redux: {
        changedAt: state.changedAt,
        state: store.getState(),
      },
    }));
  }, [state.changedAt, store, setFixtureState]);

  // Override local Redux state when fixture changed by other client
  React.useEffect(() => {
    if (!fixtureState.redux) {
      return;
    }

    // The changedAt timestamp helps distinguish external fixture state changes
    // from local ones (reacting to the latter would create an infinite loop)
    const reduxFs = fixtureState.redux as ReduxFixtureState<ReduxState>;
    if (reduxFs.changedAt > state.changedAt) {
      const store = configureStore(reduxFs.state);
      setState({
        changedAt: reduxFs.changedAt,
        store,
      });
    }
  }, [fixtureState.redux, state.changedAt, configureStore, setState]);

  return <Provider store={state.store}>{children}</Provider>;
}

ReduxMock.cosmosCapture = false;

function getTime() {
  return Date.now();
}
