/**
 * Page wrapper type definitions for the Ghost Runner core module.
 *
 * This module contains all types related to the MonitoredPage class,
 * which wraps Playwright's Page for automatic failure detection.
 *
 * @module core/page/types/page.types
 */

import type { Page } from 'playwright';

/**
 * Extract option types from Page methods using Parameters utility type.
 * These types match the Playwright Page method signatures for type safety.
 */
export type PageMethods = Page;
export type ClickOptions = Parameters<PageMethods['click']>[1];
export type FillOptions = Parameters<PageMethods['fill']>[2];
export type TypeOptions = Parameters<PageMethods['type']>[2];
export type PressOptions = Parameters<PageMethods['press']>[2];
export type CheckOptions = Parameters<PageMethods['check']>[1];
export type UncheckOptions = Parameters<PageMethods['uncheck']>[1];
export type HoverOptions = Parameters<PageMethods['hover']>[1];
export type FocusOptions = Parameters<PageMethods['focus']>[1];
export type TapOptions = Parameters<PageMethods['tap']>[1];
export type DragAndDropOptions = Parameters<PageMethods['dragAndDrop']>[2];
export type PageScreenshotOptions = Parameters<PageMethods['screenshot']>[0];
export type PdfOptions = Parameters<PageMethods['pdf']>[0];
export type SelectOptionValue = Parameters<PageMethods['selectOption']>[1];
export type SelectOptionOptions = Parameters<PageMethods['selectOption']>[2];
export type GotoOptions = Parameters<PageMethods['goto']>[1];
export type WaitForNavigationOptions = Parameters<PageMethods['waitForNavigation']>[0];
export type ScriptTagOptions = Parameters<PageMethods['addScriptTag']>[0];
export type StyleTagOptions = Parameters<PageMethods['addStyleTag']>[0];
export type WaitForFunctionOptions = Parameters<PageMethods['waitForFunction']>[1];
export type WaitForURLOptions = Parameters<PageMethods['waitForURL']>[1];
export type ReloadOptions = Parameters<PageMethods['reload']>[0];
export type GoBackOptions = Parameters<PageMethods['goBack']>[0];
export type GoForwardOptions = Parameters<PageMethods['goForward']>[0];
export type SetContentOptions = Parameters<PageMethods['setContent']>[1];
export type EmulateMediaOptions = Parameters<PageMethods['emulateMedia']>[0];
export type CloseOptions = Parameters<PageMethods['close']>[0];

/**
 * Options for creating a monitored page.
 * Configures the behavior of the MonitoredPage wrapper.
 */
export interface MonitoredPageOptions {
  /** Name of the task using this page (for error reporting) */
  taskName: string;
  /** Default timeout for selector waits in milliseconds (default: 30000) */
  defaultSelectorTimeout?: number;
  /** Default timeout for navigation in milliseconds (default: 30000) */
  defaultNavigationTimeout?: number;
}

/**
 * Internal state for the monitored page.
 * Maintains configuration during the page lifecycle.
 */
export interface MonitoredPageState {
  /** Name of the task using this page */
  taskName: string;
  /** Default timeout for selector waits in milliseconds */
  defaultSelectorTimeout: number;
  /** Default timeout for navigation in milliseconds */
  defaultNavigationTimeout: number;
}
