import axios from 'axios';
import { getReactors, getAlerts, resolveAlert } from '../api';

// jest.mock is hoisted before imports by Babel/Jest — the factory runs first.
// __esModule: true prevents Babel's interop from wrapping the mock in { default: ... },
// so `import axios from 'axios'` gives the object directly.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

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
      { reactor_id: 'A', temperature: 118, risk_score: 12, status: 'SAFE' },
      { reactor_id: 'B', temperature: 135, risk_score: 45, status: 'WARNING' },
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
      { _id: 'abc', reactor_id: 'A', alert_type: 'WARNING', resolved: false },
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
