import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MobileTabBar from './MobileTabBar'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

describe('MobileTabBar', () => {
  it('keeps the world dashboard and all four modules one tap away', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/finance']}><MobileTabBar /><LocationProbe /></MemoryRouter>)

    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前往省省省' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('button')).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: '前往世界仪表盘' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
  })
})
