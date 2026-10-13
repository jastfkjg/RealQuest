"""Hashed recovery credentials and additional guest sessions; existing saves untouched."""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    for table in ['recovery_keys', 'guest_sessions']:
        columns = [sa.Column('token_hash', sa.String(64), primary_key=True),
                   sa.Column('player_id', sa.String(36), sa.ForeignKey('players.id', ondelete='CASCADE'), nullable=False)]
        if table == 'recovery_keys':
            columns.append(sa.Column('created_at', sa.Float(), nullable=False))
        op.create_table(table, *columns)
        op.create_index(f'ix_{table}_player_id', table, ['player_id'])

def downgrade():
    op.drop_table('guest_sessions')
    op.drop_table('recovery_keys')
