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

type ReduxContextValue<ReduxState extends object> = {
  changedAt: number;
  storeState: ReduxState;
  store: Store<ReduxState>;
};

type SetReduxContextValue<ReduxState extends object> = React.Dispatch<
  React.SetStateAction<ReduxContextValue<ReduxState>>
>;

export function ReduxMock<ReduxState extends object>({
  children,
  configureStore,
  initialState
}: Props<ReduxState>) {
  const { fixtureState, setFixtureState } = React.useContext(FixtureContext);

  const [contextValue, setContextValue] = useReduxContextState<ReduxState>(
    configureStore,
    fixtureState,
    initialState
  );
  useSyncFixtureState<ReduxState>(
    contextValue,
    setContextValue,
    setFixtureState
  );
  useOverrideLocalState<ReduxState>(
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

function useReduxContextState<ReduxState extends object>(
  configureStore: ConfigureStore<ReduxState>,
  fixtureState: FixtureState,
  initialState?: Partial<ReduxState>
) {
  return React.useState<ReduxContextValue<ReduxState>>(() => {
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
  contextValue: ReduxContextValue<ReduxState>,
  setContextValue: SetReduxContextValue<ReduxState>,
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

function useOverrideLocalState<ReduxState extends object>(
  contextValue: ReduxContextValue<ReduxState>,
  fixtureState: FixtureState,
  setContextValue: SetReduxContextValue<ReduxState>,
  configureStore: ConfigureStore<ReduxState>
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
