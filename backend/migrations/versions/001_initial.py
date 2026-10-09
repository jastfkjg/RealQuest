"""Guest saves and idempotent reward audit receipts."""
from alembic import op
import sqlalchemy as sa
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('players', sa.Column('id', sa.String(36), primary_key=True), sa.Column('token_hash', sa.String(64), nullable=False), sa.Column('state', sa.JSON(), nullable=False))
    op.create_index('ix_players_token_hash', 'players', ['token_hash'], unique=True)
    op.create_table('receipts', sa.Column('id', sa.String(36), primary_key=True), sa.Column('player_id', sa.String(36), sa.ForeignKey('players.id', ondelete='CASCADE'), nullable=False), sa.Column('request_id', sa.String(80), nullable=False), sa.Column('fingerprint', sa.String(64), nullable=False), sa.Column('action', sa.String(32), nullable=False), sa.Column('changes', sa.JSON(), nullable=False), sa.Column('created_at', sa.Float(), nullable=False), sa.UniqueConstraint('player_id', 'request_id'))
    op.create_index('ix_receipts_player_id', 'receipts', ['player_id'])

def downgrade():
    op.drop_table('receipts')
    op.drop_table('players')
