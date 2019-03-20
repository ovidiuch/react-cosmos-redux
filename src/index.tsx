import * as React from 'react';
import { ReactReduxContext } from 'react-redux';
import { FixtureContext } from 'react-cosmos-fixture';
import { Store } from 'redux';
import { SetStateAsync, StateUpdater } from 'react-cosmos-shared2/util';
import { FixtureState } from 'react-cosmos-shared2/fixtureState';

type ConfigureStore<State extends object> = (
  state: Partial<State>
) => Store<State>;

type Props<State extends object> = {
  children: React.ReactNode;
  configureStore: ConfigureStore<State>;
  initialState: Partial<State>;
};

type ContextValue<State extends object> = {
  changedAt: number;
  storeState: State;
  store: Store<State>;
};

type SetContextValue<State extends object> = React.Dispatch<
  React.SetStateAction<ContextValue<State>>
>;

// TODO: Export FixtureState & SetFixtureState from react-cosmos-fixture
type SetFixtureState = SetStateAsync<StateUpdater<FixtureState>>;

export function ReduxMock<State extends object>({
  children,
  configureStore,
  initialState
}: Props<State>) {
  const { fixtureState, setFixtureState } = React.useContext(FixtureContext);

  const [contextValue, setContextValue] = useCreateContextState<State>(
    configureStore,
    initialState,
    fixtureState
  );
  useReduxSubscribe(contextValue.store, setContextValue);
  useSyncFixtureState(contextValue, setFixtureState);
  useSyncLocalState(
    contextValue,
    fixtureState,
    setContextValue,
    configureStore
  );

  return (
    <ReactReduxContext.Provider value={contextValue}>
      {children}
    </ReactReduxContext.Provider>
  );
}

ReduxMock.cosmosCapture = false;

function useCreateContextState<State extends object>(
  configureStore: ConfigureStore<State>,
  initialState: Partial<State>,
  fixtureState: FixtureState
) {
  return React.useState<ContextValue<State>>(() => {
    const state = fixtureState.redux ? fixtureState.redux.state : initialState;
    const store = configureStore(state);
    return {
      changedAt: getTime(),
      storeState: store.getState(),
      store
    };
  });
}

function useReduxSubscribe<State extends object>(
  store: Store,
  setContextValue: SetContextValue<State>
) {
  React.useEffect(
    () =>
      store.subscribe(() => {
        setContextValue({
          changedAt: getTime(),
          storeState: store.getState(),
          store
        });
      }),
    [store]
  );
}

function useSyncFixtureState<State extends object>(
  contextValue: ContextValue<State>,
  setFixtureState: SetFixtureState
) {
  React.useEffect(() => {
    setFixtureState(fixtureState => ({
      ...fixtureState,
      redux: {
        changedAt: contextValue.changedAt,
        state: contextValue.storeState
      }
    }));
  }, [contextValue.changedAt]);
}

function useSyncLocalState<State extends object>(
  contextValue: ContextValue<State>,
  fixtureState: FixtureState,
  setContextValue: SetContextValue<State>,
  configureStore: ConfigureStore<State>
) {
  React.useEffect(() => {
    if (fixtureState.redux) {
      const { changedAt, state } = fixtureState.redux;
      if (changedAt > contextValue.changedAt) {
        const store = configureStore(state);
        setContextValue({
          changedAt,
          storeState: store.getState(),
          store
        });
      }
    }
  }, [fixtureState.redux, contextValue.changedAt]);
}

function getTime() {
  return Date.now();
}
