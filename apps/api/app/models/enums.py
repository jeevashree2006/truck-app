from enum import Enum


class AxleType(str, Enum):
    single = "single"
    multi = "multi"


class BodyType(str, Enum):
    open = "open"
    container = "container"
    trailer = "trailer"
    tanker = "tanker"
    other = "other"


class VehicleStatus(str, Enum):
    empty = "empty"                      # idle / available
    on_the_way = "on_the_way"            # currently running a load
    waiting_for_unload = "waiting_for_unload"
    maintenance = "maintenance"


class DocumentType(str, Enum):
    ddc = "ddc"            # Driver Duty Card / declaration form
    rc = "rc"
    insurance = "insurance"
    fitness = "fitness"
    permit = "permit"
    road_tax = "road_tax"
    puc = "puc"
    national_permit = "national_permit"


class DocStatus(str, Enum):
    valid = "valid"        # green
    expiring = "expiring"  # yellow
    expired = "expired"    # red
    unknown = "unknown"    # no date set


class TripStatus(str, Enum):
    ongoing = "ongoing"
    completed = "completed"
    cancelled = "cancelled"


class NotificationType(str, Enum):
    document_expiry = "document_expiry"
    daily_summary = "daily_summary"
    system = "system"


# Common feet lengths for Indian lorries / trailers (informational defaults).
COMMON_LENGTHS_FEET = [14, 17, 19, 20, 22, 24, 32, 40]
