export type SpacerPattern = 'blank' | 'checkered' | 'lines' | 'dots'

export interface Spacer {
  id: string
  afterBlockIndex: number   // Insert after the Nth direct child of contentRef
  height: number            // Pixel height (user-adjustable)
  pattern: SpacerPattern
}
