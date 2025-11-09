declare module 'react-colour-wheel' {
  import { ComponentType } from 'react'

  interface ColourWheelProps {
    colour?: string
    onColourSelected?: (colour: string) => void
    radius?: number
    lineWidth?: number
    spacers?: {
      colour?: string
      shadowColor?: string
      shadowBlur?: number
    }
  }

  const ColourWheel: ComponentType<ColourWheelProps>
  export default ColourWheel
}
