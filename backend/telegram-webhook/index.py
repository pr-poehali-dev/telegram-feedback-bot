'''
Business: Webhook для приема сообщений от Telegram ботов
Args: event с httpMethod POST, body с Telegram update, queryStringParameters с bot_token
      context с request_id
Returns: HTTP response 200 OK для подтверждения получения
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
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    query_params = event.get('queryStringParameters', {}) or {}
    bot_token = query_params.get('bot_token')
    
    if not bot_token:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'bot_token is required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            'SELECT id, bot_token, welcome_text FROM bots WHERE bot_token = %s AND is_active = true',
            (bot_token,)
        )
        bot = cursor.fetchone()
        
        if not bot:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Bot not found'}),
                'isBase64Encoded': False
            }
        
        update = json.loads(event.get('body', '{}'))
        
        if 'message' not in update:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'ok': True}),
                'isBase64Encoded': False
            }
        
        message = update['message']
        chat_id = message['chat']['id']
        username = message['from'].get('username', '')
        first_name = message['from'].get('first_name', '')
        last_name = message['from'].get('last_name', '')
        message_text = message.get('text', '')
        
        if message_text == '/start':
            telegram_api_url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
            requests.post(telegram_api_url, json={
                'chat_id': chat_id,
                'text': bot['welcome_text']
            }, timeout=10)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'ok': True}),
                'isBase64Encoded': False
            }
        
        cursor.execute(
            '''INSERT INTO messages (bot_id, chat_id, username, first_name, last_name, message_text)
               VALUES (%s, %s, %s, %s, %s, %s)''',
            (bot['id'], chat_id, username, first_name, last_name, message_text)
        )
        conn.commit()
        
        telegram_api_url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
        requests.post(telegram_api_url, json={
            'chat_id': chat_id,
            'text': '✅ Спасибо! Ваше сообщение передано владельцу.'
        }, timeout=10)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': True}),
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
