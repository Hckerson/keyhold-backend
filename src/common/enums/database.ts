export enum DatabaseUnavailableCode {
    UNREACHABLE = 'P1001',
    TIMED_OUT = 'P1008',
    CONNECTION_CLOSED = 'P1017',
}

export enum PoolTimeoutMessage {
    CONNECT = 'Connection terminated due to connection timeout',
    CHECKOUT = 'timeout exceeded when trying to connect',
}
