import * as React from 'react';
import { ReactReduxContext } from 'react-redux';
import {
  FixtureContext,
  FixtureState,
  SetFixtureState
} from 'react-cosmos-fixture';
import { Store } from 'redux';

type ConfigureStore<ReduxState extends object> = (
  state: Partial<ReduxState>
) => Store<ReduxState>;

type Props<ReduxState extends object> = {
  children: React.ReactNode;
  configureStore: ConfigureStore<ReduxState>;
  initialState?: Partial<ReduxState>;
};

type ReduxContext<ReduxState extends object> = {
  changedAt: number;
  storeState: ReduxState;
  store: Store<ReduxState>;
};

type SetReduxContext<ReduxState extends object> = React.Dispatch<
  React.SetStateAction<ReduxContext<ReduxState>>
>;

export function ReduxMock<ReduxState extends object>({
  children,
  configureStore,
  initialState
}: Props<ReduxState>) {
  const { fixtureState, setFixtureState } = React.useContext(FixtureContext);

  const [reduxContext, setReduxContext] = useReduxContextState<ReduxState>(
    configureStore,
    fixtureState,
    initialState
  );
  useSyncFixtureState<ReduxState>(
    reduxContext,
    setReduxContext,
    setFixtureState
  );
  useOverrideLocalState<ReduxState>(
    reduxContext,
    fixtureState,
    setReduxContext,
    configureStore
  );

  return (
    <ReactReduxContext.Provider value={reduxContext}>
      {children}
    </ReactReduxContext.Provider>
  );
}

ReduxMock.cosmosCapture = false;

function useReduxContextState<ReduxState extends object>(
  configureStore: ConfigureStore<ReduxState>,
  fixtureState: FixtureState,
  initialState?: Partial<ReduxState>
) {
  return React.useState<ReduxContext<ReduxState>>(() => {
    const state = fixtureState.redux ? fixtureState.redux.state : initialState;
    const store = configureStore(state);
    return {
      changedAt: getTime(),
      storeState: store.getState(),
      store
    };
  });
}

function useSyncFixtureState<ReduxState extends object>(
  reduxContext: ReduxContext<ReduxState>,
  setReduxContext: SetReduxContext<ReduxState>,
  setFixtureState: SetFixtureState
) {
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
}

function useOverrideLocalState<ReduxState extends object>(
  reduxContext: ReduxContext<ReduxState>,
  fixtureState: FixtureState,
  setReduxContext: SetReduxContext<ReduxState>,
  configureStore: ConfigureStore<ReduxState>
) {
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
}

function getTime() {
  return Date.now();
}
