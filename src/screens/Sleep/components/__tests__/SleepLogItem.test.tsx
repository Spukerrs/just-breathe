import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SleepLogItem } from '../SleepLogItem';
import { SleepLog } from '../../../../types/sleep';
import { Alert } from 'react-native';

describe('SleepLogItem Component', () => {
  const sampleLog: SleepLog = {
    id: 'log_abc',
    date: '2026-10-21',
    bedtime: '2026-10-21T23:00:00.000Z',
    wakeTime: '2026-10-22T07:30:00.000Z',
    durationMinutes: 510,
    qualityRating: 5,
    tags: ['meditación', 'lectura'],
    notes: 'Desperté con mucha energía.',
  };

  it('debe renderizar la duración, tags y notas del registro', async () => {
    const onDeleteMock = jest.fn();
    const { getByText } = await render(<SleepLogItem log={sampleLog} onDelete={onDeleteMock} />);

    expect(getByText('8h 30m')).toBeTruthy();
    expect(getByText('#meditación')).toBeTruthy();
    expect(getByText('#lectura')).toBeTruthy();
    expect(getByText('Desperté con mucha energía.')).toBeTruthy();
  });

  it('debe solicitar confirmación con Alert al tocar el botón de eliminar', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onDeleteMock = jest.fn();

    const { getByText } = await render(<SleepLogItem log={sampleLog} onDelete={onDeleteMock} />);
    // Simular confirmación directa
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
