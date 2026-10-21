"""Receipts allow safe confirmation of client data deletion; saves unchanged."""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('client_deletions',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('request_id', sa.String(80), primary_key=True),
        sa.Column('save_id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.Float(), nullable=False))


def downgrade():
    op.drop_table('client_deletions')
