import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LiveTrackerCard } from '../LiveTrackerCard';
import { ActiveSleepSession } from '../../../../types/sleep';

describe('LiveTrackerCard Component', () => {
  it('debe renderizar estado inactivo con botón "Ir a dormir" cuando no hay sesión activa', async () => {
    const onStartSleep = jest.fn();
    const onWakeUp = jest.fn();
    const onCancelSleep = jest.fn();

    const { getByText } = await render(
      <LiveTrackerCard
        activeSession={null}
        onStartSleep={onStartSleep}
        onWakeUp={onWakeUp}
        onCancelSleep={onCancelSleep}
      />
    );

    expect(getByText('Tracker en Vivo')).toBeTruthy();
    expect(getByText('Ir a dormir')).toBeTruthy();

    fireEvent.press(getByText('Ir a dormir'));
    expect(onStartSleep).toHaveBeenCalledTimes(1);
  });

  it('debe renderizar estado activo con botón "Despertar y Calificar" cuando hay sesión activa', async () => {
    const onStartSleep = jest.fn();
    const onWakeUp = jest.fn();
    const onCancelSleep = jest.fn();

    const session: ActiveSleepSession = {
      startTime: '2026-10-21T01:00:00.000Z',
      startDate: '2026-10-21',
      sessionType: 'nap',
      targetDurationMinutes: 60,
    };

    const { getByText } = await render(
      <LiveTrackerCard
        activeSession={session}
        onStartSleep={onStartSleep}
        onWakeUp={onWakeUp}
        onCancelSleep={onCancelSleep}
      />
    );

    expect(getByText('SESIÓN EN CURSO')).toBeTruthy();
    expect(getByText('Despertar y Calificar')).toBeTruthy();

    fireEvent.press(getByText('Despertar y Calificar'));
    expect(onWakeUp).toHaveBeenCalledWith(session.startTime);
  });
});
