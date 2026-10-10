import midnightBlue from './assets/cars/midnight_blue.webp'
import midnightBlueBlackRoof from './assets/cars/midnight_blue_black_roof.webp'
import pearlWhite from './assets/cars/pearl_white.webp'
import pearlWhiteBlackRoof from './assets/cars/pearl_white_black_roof.webp'
import popGreen from './assets/cars/pop_green.webp'
import popGreenBlackRoof from './assets/cars/pop_green_black_roof.webp'
import popYellow from './assets/cars/pop_yellow.webp'
import popYellowBlackRoof from './assets/cars/pop_yellow_black_roof.webp'
import slateGrey from './assets/cars/slate_grey.webp'
import slateGreyBlackRoof from './assets/cars/slate_grey_black_roof.webp'
import starryBlack from './assets/cars/starry_black.webp'

// Body colours of the Renault 5 E-Tech catalogue, in the order of the editor
// dropdown. There is no black-roof variant of the black paint.
export const CAR_IMAGES = {
  pop_yellow: popYellow,
  pop_yellow_black_roof: popYellowBlackRoof,
  pop_green: popGreen,
  pop_green_black_roof: popGreenBlackRoof,
  pearl_white: pearlWhite,
  pearl_white_black_roof: pearlWhiteBlackRoof,
  midnight_blue: midnightBlue,
  midnight_blue_black_roof: midnightBlueBlackRoof,
  slate_grey: slateGrey,
  slate_grey_black_roof: slateGreyBlackRoof,
  starry_black: starryBlack,
} as const

export type CarColor = keyof typeof CAR_IMAGES

export const CAR_COLORS = Object.keys(CAR_IMAGES) as CarColor[]
export const DEFAULT_COLOR: CarColor = 'pop_yellow'
