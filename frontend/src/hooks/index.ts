/**
 * Hooks Index - Centralized exports for all custom hooks
 *
 * This file re-exports all custom hooks for convenient importing.
 *
 * @example
 * import { useApi, useSocket, useFailureFilters, useScheduler } from '@/hooks';
 */

export { useApi, useGet, usePost } from './useApi';
export type { UseApiResult, UseApiOptions } from './useApi';

export { useSocket, useSocketEvent, useSocketReconnect } from './useSocket';
export type { UseSocketResult, UseSocketOptions, SocketEventHandler, ConnectionState } from './useSocket';

export { useScheduler } from './useScheduler';
export type { UseSchedulerResult, UseSchedulerOptions, SchedulerStatus } from './useScheduler';

export { useFailureFilters, useFailureFiltersWithSort } from './useFailureFilters';
export type { UseFailureFiltersResult, FailureFilters } from './useFailureFilters';

export { useFailureStyles, useFailureAnimationVariants } from './useFailureStyles';
export type { UseFailureStylesResult, FailureStyleConfig, FailureStyleConfigWithLabel } from './useFailureStyles';
