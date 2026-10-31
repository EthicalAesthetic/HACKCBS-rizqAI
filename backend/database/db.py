from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from settings import DATABASE_URL
from database.models import Base


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    from database.models import UserAccount
    db = SessionLocal()
    try:
        user = db.query(UserAccount).filter_by(id="e8eb2ba5-ffa1-413c-93bc-e662d26cff98").first()
        if not user:
            user = UserAccount(
                id="e8eb2ba5-ffa1-413c-93bc-e662d26cff98",
                name="Senior Analyst",
                email="demo@rizq.ai",
                password_hash="disabled",
            )
            db.add(user)
            db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Default user ensure notice: {exc}")
    finally:
        db.close()

