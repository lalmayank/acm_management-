from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    VOLUNTEER = "volunteer"
    PARTICIPANT = "participant"


class TicketStatusEnum(str, Enum):
    AVAILABLE = "AVAILABLE"
    PARTIALLY_USED = "PARTIALLY_USED"
    REDEEMED = "REDEEMED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    PENDING = "PENDING"


class ScanOutcomeEnum(str, Enum):
    VALID = "VALID"
    ALREADY_REDEEMED = "ALREADY_REDEEMED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    NOT_ELIGIBLE = "NOT_ELIGIBLE"
    NOT_AUTHORIZED = "NOT_AUTHORIZED"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"


class PresentationStatusEnum(str, Enum):
    UPCOMING = "UPCOMING"
    ON_STAGE = "ON_STAGE"
    COMPLETED = "COMPLETED"
    DELAYED = "DELAYED"
    CANCELLED = "CANCELLED"


class TaskStatusEnum(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


class PriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"
