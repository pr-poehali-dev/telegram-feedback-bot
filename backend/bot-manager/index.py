'''
Business: Управление телеграм-ботами - создание, настройка, получение списка
Args: event с httpMethod, body, queryStringParameters, headers с X-User-Id
      context с request_id
Returns: HTTP response с данными бота или списком ботов
'''

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
import requests

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id', 'anonymous')
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            bot_token = body.get('bot_token', '').strip()
            
            if not bot_token:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'bot_token is required'}),
                    'isBase64Encoded': False
                }
            
            telegram_api_url = f'https://api.telegram.org/bot{bot_token}/getMe'
            response = requests.get(telegram_api_url, timeout=10)
            
            if response.status_code != 200:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid bot token'}),
                    'isBase64Encoded': False
                }
            
            bot_info = response.json()
            if not bot_info.get('ok'):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid bot token'}),
                    'isBase64Encoded': False
                }
            
            bot_username = bot_info['result']['username']
            
            cursor.execute(
                '''INSERT INTO bots (owner_id, bot_token, bot_username, welcome_text)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (bot_token) DO UPDATE 
                   SET owner_id = EXCLUDED.owner_id, 
                       bot_username = EXCLUDED.bot_username,
                       is_active = true,
                       updated_at = CURRENT_TIMESTAMP
                   RETURNING id, owner_id, bot_username, welcome_text, is_active, created_at''',
                (user_id, bot_token, bot_username, body.get('welcome_text', 'Привет! Напиши мне сообщение, и я передам его владельцу.'))
            )
            
            bot_data = dict(cursor.fetchone())
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'bot': bot_data}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'GET':
            cursor.execute(
                'SELECT id, bot_username, welcome_text, is_active, created_at FROM bots WHERE owner_id = %s AND is_active = true',
                (user_id,)
            )
            bots = [dict(row) for row in cursor.fetchall()]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'bots': bots}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            bot_id = body.get('bot_id')
            welcome_text = body.get('welcome_text')
            
            if not bot_id or not welcome_text:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'bot_id and welcome_text are required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute(
                'UPDATE bots SET welcome_text = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND owner_id = %s RETURNING id',
                (welcome_text, bot_id, user_id)
            )
            
            if cursor.rowcount == 0:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Bot not found'}),
                    'isBase64Encoded': False
                }
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            query_params = event.get('queryStringParameters', {}) or {}
            bot_id = query_params.get('bot_id')
            
            if not bot_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'bot_id is required'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute(
                'UPDATE bots SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND owner_id = %s RETURNING id',
                (bot_id, user_id)
            )
            
            if cursor.rowcount == 0:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Bot not found'}),
                    'isBase64Encoded': False
                }
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    
    finally:
        cursor.close()
        conn.close()
