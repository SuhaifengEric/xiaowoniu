import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DatePicker } from './date-picker'

function DatePickerHarness() {
  const [value, setValue] = useState('2026-07-30')
  return (
    <>
      <label htmlFor="test-date">日期</label>
      <DatePicker id="test-date" value={value} onValueChange={setValue} />
      <output data-testid="date-value">{value}</output>
    </>
  )
}

describe('DatePicker', () => {
  it('uses a shadcn-style calendar popover, keeps local YYYY-MM-DD values, and supports clearing', async () => {
    const user = userEvent.setup()
    render(<DatePickerHarness />)

    expect(screen.getByLabelText('日期')).toHaveTextContent('2026年7月30日')
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('日期'))
    expect(await screen.findByRole('grid', { name: '2026年7月' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '2026年7月31日' }))

    expect(screen.getByTestId('date-value')).toHaveTextContent('2026-07-31')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(document.body.style.pointerEvents).not.toBe('none')

    await user.click(screen.getByRole('button', { name: '清除日期' }))
    expect(screen.getByTestId('date-value')).toBeEmptyDOMElement()
  })
})
