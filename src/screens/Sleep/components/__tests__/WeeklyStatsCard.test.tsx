import React from 'react';
import { render } from '@testing-library/react-native';
import { WeeklyStatsCard } from '../WeeklyStatsCard';
import { SleepStats } from '../../../../types/sleep';

describe('WeeklyStatsCard Component', () => {
  it('debe renderizar métricas cuando no hay registros (valores por defecto)', async () => {
    const emptyStats: SleepStats = {
      averageHours: 0,
      averageQuality: 0,
      totalLogsLast7Days: 0,
      totalMinutesLast7Days: 0,
    };

    const { getByText, getAllByText } = await render(<WeeklyStatsCard stats={emptyStats} />);
    expect(getByText('Resumen Semanal (Últimos 7 días)')).toBeTruthy();
    expect(getByText('0 noches')).toBeTruthy();
    expect(getAllByText('--').length).toBe(2);
    expect(getByText('Sin registros')).toBeTruthy();
  });

  it('debe renderizar el promedio y estrellas cuando hay datos válidos', async () => {
    const validStats: SleepStats = {
      averageHours: 7.5,
      averageQuality: 4.5,
      totalLogsLast7Days: 5,
      totalMinutesLast7Days: 2250,
    };

    const { getByText } = await render(<WeeklyStatsCard stats={validStats} />);
    expect(getByText('5 noches')).toBeTruthy();
    expect(getByText('7h 30m')).toBeTruthy();
    expect(getByText('4.5')).toBeTruthy();
    expect(getByText('Óptima recuperación')).toBeTruthy();
  });
});
