import { waitFor } from '@testing-library/dom';
import { cleanup, fireEvent, render } from '@testing-library/react';
import * as React from 'react';
import { FixtureContext } from 'react-cosmos/fixture';
import { connect } from 'react-redux';
import { createStore } from 'redux';
import { ReduxMock } from '.';

afterEach(cleanup);

it('renders children', async () => {
  const reducer = () => ({});
  const { findByText } = render(
    <ReduxMock
      configureStore={(state) => createStore(reducer, state)}
      initialState={{}}
    >
      Ola Cosmos!
    </ReduxMock>
  );
  await findByText('Ola Cosmos!');
});

it('injects initial state', async () => {
  type Props = { yay: boolean };
  const RawComponent = ({ yay }: Props) => <>{yay ? 'Yay!' : 'Nay!'}</>;

  type State = { yay: boolean };
  const reducer = (prevState: State = { yay: false }) => prevState;

  const mapStateToProps = ({ yay }: State) => ({ yay });
  const ConnectedComponent = connect(mapStateToProps)(RawComponent);

  const { findByText } = render(
    <ReduxMock
      configureStore={(state) => createStore(reducer, state)}
      initialState={{ yay: true }}
    >
      <ConnectedComponent />
    </ReduxMock>
  );
  await findByText('Yay!');
});

it('injects fixture state', async () => {
  type Props = { yay: boolean };
  const RawComponent = ({ yay }: Props) => <>{yay ? 'Yay!' : 'Nay!'}</>;

  type State = { yay: boolean };
  const reducer = (prevState: State = { yay: false }) => prevState;

  const mapStateToProps = ({ yay }: State) => ({ yay });
  const ConnectedComponent = connect(mapStateToProps)(RawComponent);

  const { findByText } = render(
    <FixtureContext.Provider
      value={{
        fixtureState: {
          redux: {
            changedAt: Date.now(),
            state: { yay: true },
          },
        },
        setFixtureState: () => {},
      }}
    >
      <ReduxMock configureStore={(state) => createStore(reducer, state)}>
        <ConnectedComponent />
      </ReduxMock>
    </FixtureContext.Provider>
  );
  await findByText('Yay!');
});

it('syncs fixture state on local state change', async () => {
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
        setFixtureState: (stateUpdater) => {
          fixtureState = stateUpdater(fixtureState);
        },
      }}
    >
      <ReduxMock configureStore={(state) => createStore(reducer, state)}>
        <ConnectedComponent />
      </ReduxMock>
    </FixtureContext.Provider>
  );

  fireEvent.click(getByText('Yay!'));
  await waitFor(() => {
    expect(fixtureState.redux).toEqual({
      changedAt: expect.any(Number),
      state: {
        yay: true,
      },
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
        setFixtureState: () => {},
      }}
    >
      <ReduxMock
        configureStore={(state) => createStore(reducer, state)}
        initialState={{ yay: true }}
      >
        <ConnectedComponent />
      </ReduxMock>
    </FixtureContext.Provider>
  );

  const { findByText, rerender } = render(getElement({}));
  await findByText('Yay!');
  rerender(
    getElement({
      redux: {
        changedAt: Date.now(),
        state: { yay: false },
      },
    })
  );
  await findByText('Nay!');
});
