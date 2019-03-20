import * as React from 'react';
import { createStore } from 'redux';
import { render, waitForElement } from 'react-testing-library';
import { ReduxMock } from '.';

it('renders children', async () => {
  const noopReducer = () => ({});
  const { getByText } = render(
    <ReduxMock
      configureStore={state => createStore(noopReducer, state)}
      initialState={{}}
    >
      Ola Cosmos!
    </ReduxMock>
  );
  await waitForElement(() => getByText('Ola Cosmos!'));
});
