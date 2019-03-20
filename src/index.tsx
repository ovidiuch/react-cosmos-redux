import * as React from 'react';
import { ReactReduxContext } from 'react-redux';
import {
  FixtureContext,
  FixtureState,
  SetFixtureState
} from 'react-cosmos-fixture';
import { Store } from 'redux';

type ConfigureStore<State extends object> = (
  state: Partial<State>
) => Store<State>;

type Props<State extends object> = {
  children: React.ReactNode;
  configureStore: ConfigureStore<State>;
  initialState?: Partial<State>;
};

type ContextValue<State extends object> = {
  changedAt: number;
  storeState: State;
  store: Store<State>;
};

type SetContextValue<State extends object> = React.Dispatch<
  React.SetStateAction<ContextValue<State>>
>;

export function ReduxMock<State extends object>({
  children,
  configureStore,
  initialState
}: Props<State>) {
  const { fixtureState, setFixtureState } = React.useContext(FixtureContext);

  const [contextValue, setContextValue] = useCreateContextState<State>(
    configureStore,
    fixtureState,
    initialState
  );
  useSyncFixtureState(contextValue, setContextValue, setFixtureState);
  useOverrideLocalState(
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
  fixtureState: FixtureState,
  initialState?: Partial<State>
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

function useSyncFixtureState<State extends object>(
  contextValue: ContextValue<State>,
  setContextValue: SetContextValue<State>,
  setFixtureState: SetFixtureState
) {
  const { store } = contextValue;
  React.useEffect(
    () =>
      store.subscribe(() => {
        setContextValue({
          changedAt: getTime(),
          storeState: store.getState(),
          store
        });
      }),
    [store, setContextValue]
  );

  const { changedAt, storeState } = contextValue;
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

function useOverrideLocalState<State extends object>(
  contextValue: ContextValue<State>,
  fixtureState: FixtureState,
  setContextValue: SetContextValue<State>,
  configureStore: ConfigureStore<State>
) {
  React.useEffect(() => {
    if (!fixtureState.redux) {
      return;
    }

    const { changedAt, state } = fixtureState.redux;
    if (changedAt > contextValue.changedAt) {
      const store = configureStore(state);
      setContextValue({
        changedAt,
        storeState: store.getState(),
        store
      });
    }
  }, [
    fixtureState.redux,
    contextValue.changedAt,
    configureStore,
    setContextValue
  ]);
}

function getTime() {
  return Date.now();
}
