import enum


class SizeLabel(str, enum.Enum):
    XS = "XS"
    S = "S"
    M = "M"
    L = "L"
    XL = "XL"
    XXL = "XXL"


class TopsFit(str, enum.Enum):
    TIGHT = "tight"
    REGULAR = "regular"
    OVERSIZED = "oversized"


class BottomsFit(str, enum.Enum):
    SLIM = "slim"
    STRAIGHT = "straight"
    LOOSE = "loose"


class OuterwearFit(str, enum.Enum):
    SNUG = "snug"
    REGULAR = "regular"
    LAYERING = "layering"


class BodyShape(str, enum.Enum):
    BROAD_SHOULDERS = "broad_shoulders"
    LONG_TORSO = "long_torso"
    STANDARD = "standard"


class FitFeedback(str, enum.Enum):
    TOO_SMALL = "too_small"
    TOO_BIG = "too_big"
    FITS = "fits"
