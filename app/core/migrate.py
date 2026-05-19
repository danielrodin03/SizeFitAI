"""Lightweight SQLite migrations for local development."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

NEW_COLUMNS: list[tuple[str, str]] = [
    ("zara_size", "VARCHAR(8)"),
    ("hm_size", "VARCHAR(8)"),
    ("asos_size", "VARCHAR(8)"),
    ("nike_size", "VARCHAR(8)"),
    ("tops_fit", "VARCHAR(32)"),
    ("bottoms_fit", "VARCHAR(32)"),
    ("outerwear_fit", "VARCHAR(32)"),
    ("body_shape", "VARCHAR(32)"),
]


def migrate_user_profiles(connection: Connection) -> None:
    inspector = inspect(connection)
    if not inspector.has_table("user_profiles"):
        return

    existing = {col["name"] for col in inspector.get_columns("user_profiles")}

    for column_name, column_type in NEW_COLUMNS:
        if column_name not in existing:
            connection.execute(
                text(f"ALTER TABLE user_profiles ADD COLUMN {column_name} {column_type}")
            )
            existing.add(column_name)

    if "preferred_size" in existing:
        connection.execute(
            text(
                """
                UPDATE user_profiles
                SET
                    zara_size = COALESCE(zara_size, preferred_size, 'M'),
                    hm_size = COALESCE(hm_size, preferred_size, 'M'),
                    asos_size = COALESCE(asos_size, preferred_size, 'M'),
                    nike_size = COALESCE(nike_size, preferred_size, 'M')
                """
            )
        )
    if "preferred_style" in existing:
        connection.execute(
            text(
                """
                UPDATE user_profiles
                SET tops_fit = COALESCE(tops_fit, preferred_style, 'regular')
                WHERE tops_fit IS NULL
                """
            )
        )

    connection.execute(
        text(
            """
            UPDATE user_profiles
            SET
                zara_size = COALESCE(zara_size, 'M'),
                hm_size = COALESCE(hm_size, 'M'),
                asos_size = COALESCE(asos_size, 'M'),
                nike_size = COALESCE(nike_size, 'M'),
                tops_fit = COALESCE(tops_fit, 'regular'),
                bottoms_fit = COALESCE(bottoms_fit, 'straight'),
                outerwear_fit = COALESCE(outerwear_fit, 'regular'),
                body_shape = COALESCE(body_shape, 'standard')
            """
        )
    )
