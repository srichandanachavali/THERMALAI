import axios from 'axios';
import { getReactors, getAlerts, resolveAlert } from '../api';

// jest.mock is hoisted before imports by Babel/Jest — the factory runs first.
// __esModule: true prevents Babel's interop from wrapping the mock in { default: ... },
// so `import axios from 'axios'` gives the object directly.
jest.mock('axios', () => {
  const get = jest.fn();
  const put = jest.fn();
  return {
    __esModule: true,
    default: {
      get,
      put,
      // api.js calls axios.create({ baseURL }) then uses client.get/client.put.
      // The client delegates to the shared mock fns but prepends baseURL, so a
      // relative call like client.get("/reactors") reaches the mock as the full
      // URL the tests assert against (mirrors real axios.create behavior).
      create: jest.fn((config) => {
        const base = config?.baseURL || '';
        return {
          get: (url) => get(base + url),
          put: (url) => put(base + url),
          interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
          },
        };
      }),
    },
  };
});

const BASE_URL = 'http://localhost:5000/api';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getReactors
// ---------------------------------------------------------------------------

describe('getReactors()', () => {
  it('calls GET /api/reactors', async () => {
    axios.get.mockResolvedValue({ data: [] });

    await getReactors();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/reactors`);
  });

  it('returns the response data', async () => {
    const mockReactors = [
      { reactor_id: 'R-101', temperature: 118, risk_score: 12, status: 'SAFE' },
      { reactor_id: 'R-102', temperature: 135, risk_score: 45, status: 'WARNING' },
    ];
    axios.get.mockResolvedValue({ data: mockReactors });

    const result = await getReactors();

    expect(result).toEqual(mockReactors);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getAlerts
// ---------------------------------------------------------------------------

describe('getAlerts()', () => {
  it('calls GET /api/alerts', async () => {
    axios.get.mockResolvedValue({ data: [] });

    await getAlerts();

    expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/alerts`);
  });

  it('returns the response data', async () => {
    const mockAlerts = [
      { _id: 'abc', reactor_id: 'R-101', alert_type: 'WARNING', resolved: false },
    ];
    axios.get.mockResolvedValue({ data: mockAlerts });

    const result = await getAlerts();

    expect(result).toEqual(mockAlerts);
  });
});

// ---------------------------------------------------------------------------
// resolveAlert
// ---------------------------------------------------------------------------

describe('resolveAlert(id)', () => {
  it('calls PUT /api/alerts/:id/resolve with the correct URL', async () => {
    axios.put.mockResolvedValue({ data: { success: true } });

    await resolveAlert('abc123');

    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(axios.put).toHaveBeenCalledWith(`${BASE_URL}/alerts/abc123/resolve`);
  });

  it('returns the response data', async () => {
    const mockResponse = { success: true, alert: { _id: 'abc123', resolved: true } };
    axios.put.mockResolvedValue({ data: mockResponse });

    const result = await resolveAlert('abc123');

    expect(result).toEqual(mockResponse);
    expect(result.alert.resolved).toBe(true);
  });

  it('uses the id argument in the URL', async () => {
    axios.put.mockResolvedValue({ data: { success: true } });

    await resolveAlert('xyz999');

    expect(axios.put).toHaveBeenCalledWith(`${BASE_URL}/alerts/xyz999/resolve`);
  });
});
