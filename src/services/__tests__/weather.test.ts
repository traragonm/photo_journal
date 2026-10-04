import { WeatherService, skyFromCode, weatherFromConditions, weatherRequestUrl } from '../WeatherService';

describe('weatherFromConditions', () => {
  it('maps WMO codes to the drum choices', () => {
    expect(weatherFromConditions(0, 30)).toBe('sunny');
    expect(weatherFromConditions(1, 30)).toBe('sunny');
    expect(weatherFromConditions(3, 28)).toBe('cloudy');
    expect(weatherFromConditions(45, 25)).toBe('cloudy');
    expect(weatherFromConditions(61, 26)).toBe('rainy');
    expect(weatherFromConditions(95, 27)).toBe('rainy');
    expect(weatherFromConditions(73, -2)).toBe('cold');
  });

  it('reads cold below the threshold unless it rains', () => {
    expect(weatherFromConditions(0, 12)).toBe('cold');
    expect(weatherFromConditions(3, 15)).toBe('cold');
    expect(weatherFromConditions(63, 10)).toBe('rainy');
    expect(weatherFromConditions(0, null)).toBe('sunny');
  });
});

describe('skyFromCode', () => {
  it('gives storms and snow their own sky', () => {
    expect(skyFromCode(0)).toBe('sun');
    expect(skyFromCode(3)).toBe('cloud');
    expect(skyFromCode(63)).toBe('rain');
    expect(skyFromCode(95)).toBe('storm');
    expect(skyFromCode(75)).toBe('snow');
  });
});

describe('WeatherService', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends only rounded coordinates', () => {
    const url = weatherRequestUrl({ latitude: 21.028511, longitude: 105.804817 });
    expect(url).toContain('latitude=21.03');
    expect(url).toContain('longitude=105.80');
    expect(url).not.toContain('21.0285');
  });

  it('parses the current conditions', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current: { weather_code: 80, temperature_2m: 27.4 } }),
    }) as unknown as typeof fetch;
    await expect(WeatherService.getCurrentConditions({ latitude: 21, longitude: 105 })).resolves.toEqual({
      weather: 'rainy',
      sky: 'rain',
      temperatureC: 27.4,
    });
  });

  it('resolves null when offline or the response is odd', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await expect(WeatherService.getCurrentConditions({ latitude: 21, longitude: 105 })).resolves.toBeNull();

    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    await expect(WeatherService.getCurrentConditions({ latitude: 21, longitude: 105 })).resolves.toBeNull();

    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(WeatherService.getCurrentConditions({ latitude: 21, longitude: 105 })).resolves.toBeNull();
  });
});
