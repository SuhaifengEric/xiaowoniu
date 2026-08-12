import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Toast from './toast'

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('auto-dismisses after the configured duration', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast message="目标已更新" onDismiss={onDismiss} duration={3000} />)

    expect(screen.getByRole('status')).toHaveTextContent('目标已更新')
    act(() => vi.advanceTimersByTime(2999))
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('supports a visible non-native close button', () => {
    const onDismiss = vi.fn()
    render(<Toast message="资料已保存" onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: '关闭成功提示' }))

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
