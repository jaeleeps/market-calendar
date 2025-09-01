import { TradingSessionLabel } from './types'

/**
 * Default mapping of session labels to simplified strings.
 * Can be overridden in markSession.
 */
export const DEFAULT_LABEL_MAP: Record<TradingSessionLabel, string> = {
  pre: 'pre',
  rth_pre_break: 'rth',
  rth: 'rth',
  break: 'break',
  rth_post_break: 'rth',
  post: 'post',
  closed: 'closed',
}
