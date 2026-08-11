# ThermalAI — Context Index

One line per doc. Load the relevant file when your task touches that domain.

- [Architecture](architecture.md) — how are the three services wired together, what flows where, which ports?
- [API Contracts](api-contracts.md) — what are the exact REST endpoint shapes, request/response payloads, and WebSocket events?
- [ML Models](ml-models.md) — how does the RF+LSTM ensemble work, what does each prediction endpoint do, how is risk scored?
- [Data Models](data-models.md) — what are the MongoDB schemas (Reactor, Alert, User), indexes, and TTL rules?
- [Frontend Patterns](frontend-patterns.md) — how are pages/components structured, how does SocketContext distribute state, what are the UI conventions?
- [Frontend Widgets](frontend-widgets.md) — component catalog, ASM HMI widget usage, deprecated components, and the localStorage auth pattern?
- [Dev Commands](dev-commands.md) — how do I start, test, build, and deploy each service?
- [Known Issues](known-issues.md) — what bugs, deployment blockers, and technical debt items are currently open?
- [Tunables](tunables.md) — what are every operator knob's current values and which source line owns each?
- [Open Work](open_work.md) — which source files have no test coverage and why does it matter?
- [Roadmap](roadmap.md) — what are the next highest-impact improvements, ranked?
