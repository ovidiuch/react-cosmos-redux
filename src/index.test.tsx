import * as React from 'react';
import { createStore } from 'redux';
import { connect } from 'react-redux';
import { FixtureContext } from 'react-cosmos-fixture';
import {
  render,
  waitForElement,
  fireEvent,
  cleanup,
  wait
} from 'react-testing-library';
import { ReduxMock } from '.';

afterEach(cleanup);

it('renders children', async () => {
  const reducer = () => ({});
  const { getByText } = render(
    <ReduxMock
      configureStore={state => createStore(reducer, state)}
      initialState={{}}
    >
      Ola Cosmos!
    </ReduxMock>
  );
  await waitForElement(() => getByText('Ola Cosmos!'));
});

it('injects initial state into Redux store', async () => {
  type Props = { yay: boolean };
  const RawComponent = ({ yay }: Props) => <>{yay ? 'Yay!' : 'Nay!'}</>;

  type State = { yay: boolean };
  const reducer = (prevState: State = { yay: false }) => prevState;

  const mapStateToProps = ({ yay }: State) => ({ yay });
  const ConnectedComponent = connect(mapStateToProps)(RawComponent);

  const { getByText } = render(
    <ReduxMock
      configureStore={state => createStore(reducer, state)}
      initialState={{ yay: true }}
    >
      <ConnectedComponent />
    </ReduxMock>
  );
  await waitForElement(() => getByText('Yay!'));
});

it('syncs Redux fixture state on local store change', async () => {
  type Props = { setYay: () => void };
  const RawComponent = ({ setYay }: Props) => (
    <button onClick={setYay}>Yay!</button>
  );

  type State = { yay: boolean };
  type Action = { type: 'SET_YAY' };
  const reducer = (
    prevState: State = { yay: false },
    action: Action
  ): State => {
    switch (action.type) {
      case 'SET_YAY':
        return { yay: true };
      default:
        return prevState;
    }
  };

  const mapStateToProps = () => ({});
  const mapDispatchToProps = { setYay: () => ({ type: 'SET_YAY' }) };
  const ConnectedComponent = connect(
    mapStateToProps,
    mapDispatchToProps
  )(RawComponent);

  let fixtureState: any = {};
  const { getByText } = render(
    <FixtureContext.Provider
      value={{
        fixtureState,
        setFixtureState: stateUpdater => {
          fixtureState = stateUpdater(fixtureState);
        }
      }}
    >
      <ReduxMock configureStore={state => createStore(reducer, state)}>
        <ConnectedComponent />
      </ReduxMock>
    </FixtureContext.Provider>
  );

  fireEvent.click(getByText('Yay!'));
  await wait(() => {
    expect(fixtureState.redux).toEqual({
      changedAt: expect.any(Number),
      state: {
        yay: true
      }
    });
  });
});

it('overrides local state on fixture state change', async () => {
  type Props = { yay: boolean };
  const RawComponent = ({ yay }: Props) => <>{yay ? 'Yay!' : 'Nay!'}</>;

  type State = { yay: boolean };
  const reducer = (prevState: State = { yay: false }) => prevState;

  const mapStateToProps = ({ yay }: State) => ({ yay });
  const ConnectedComponent = connect(mapStateToProps)(RawComponent);

  const getElement = (fixtureState: {}) => (
    <FixtureContext.Provider
      value={{
        fixtureState,
        setFixtureState: () => {}
      }}
    >
      <ReduxMock
        configureStore={state => createStore(reducer, state)}
        initialState={{ yay: true }}
      >
        <ConnectedComponent />
      </ReduxMock>
    </FixtureContext.Provider>
  );

  const { getByText, rerender } = render(getElement({}));
  await waitForElement(() => getByText('Yay!'));
  rerender(
    getElement({
      redux: {
        changedAt: Date.now(),
        state: { yay: false }
      }
    })
  );
  await waitForElement(() => getByText('Nay!'));
});
