"""Optional username accounts; existing player IDs, state and receipts stay intact."""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('accounts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(24), nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('player_id', sa.String(36), sa.ForeignKey('players.id', ondelete='SET NULL'), unique=True),
        sa.Column('created_at', sa.Float(), nullable=False))
    op.create_index('ix_accounts_username', 'accounts', ['username'], unique=True)
    op.create_table('account_sessions',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('account_id', sa.String(36), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('expires_at', sa.Float(), nullable=False))
    op.create_index('ix_account_sessions_account_id', 'account_sessions', ['account_id'])
    op.create_table('auth_throttles',
        sa.Column('key', sa.String(64), primary_key=True),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('reset_at', sa.Float(), nullable=False))


def downgrade():
    op.drop_table('auth_throttles')
    op.drop_table('account_sessions')
    op.drop_table('accounts')
