'''
Business: Telegram-бот конструктор для управления другими ботами
Args: event с httpMethod POST, body с Telegram update
      context с request_id
Returns: HTTP response 200 OK
'''

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
import requests

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def get_user_state(cursor, telegram_user_id: int) -> Dict[str, Any]:
    cursor.execute(
        '''SELECT state, state_data FROM bot_constructor_users 
           WHERE telegram_user_id = %s''',
        (telegram_user_id,)
    )
    result = cursor.fetchone()
    if result:
        return {
            'state': result['state'],
            'state_data': json.loads(result['state_data']) if result['state_data'] else {}
        }
    return {'state': 'idle', 'state_data': {}}

def set_user_state(cursor, telegram_user_id: int, username: str, state: str, state_data: Dict = None):
    cursor.execute(
        '''INSERT INTO bot_constructor_users (telegram_user_id, telegram_username, state, state_data, updated_at)
           VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
           ON CONFLICT (telegram_user_id) DO UPDATE 
           SET state = EXCLUDED.state, 
               state_data = EXCLUDED.state_data,
               telegram_username = EXCLUDED.telegram_username,
               updated_at = CURRENT_TIMESTAMP''',
        (telegram_user_id, username, state, json.dumps(state_data) if state_data else None)
    )

def send_message(bot_token: str, chat_id: int, text: str, reply_markup: Dict = None):
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
    if reply_markup:
        payload['reply_markup'] = reply_markup
    requests.post(url, json=payload, timeout=10)

def get_main_menu_keyboard():
    return {
        'inline_keyboard': [
            [{'text': '🤖 Создать бота', 'callback_data': 'create_bot'}],
            [{'text': '⚙️ Мои боты', 'callback_data': 'my_bots'}],
            [{'text': '💬 Входящие сообщения', 'callback_data': 'messages'}],
        ]
    }

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
        update = json.loads(event.get('body', '{}'))
        
        if 'message' in update:
            message = update['message']
            chat_id = message['chat']['id']
            telegram_user_id = message['from']['id']
            username = message['from'].get('username', 'user')
            text = message.get('text', '')
            
            user_state = get_user_state(cursor, telegram_user_id)
            current_state = user_state['state']
            state_data = user_state['state_data']
            
            if text == '/start':
                set_user_state(cursor, telegram_user_id, username, 'idle', {})
                conn.commit()
                
                welcome_text = (
                    "🤖 <b>Добро пожаловать в Bot Constructor!</b>\n\n"
                    "Я помогу вам создать своего Telegram-бота для обратной связи.\n\n"
                    "Выберите действие:"
                )
                send_message(bot_token, chat_id, welcome_text, get_main_menu_keyboard())
            
            elif current_state == 'waiting_bot_token':
                if len(text) < 10 or ':' not in text:
                    send_message(bot_token, chat_id, '❌ Некорректный токен. Попробуйте ещё раз или отправьте /start для отмены.')
                else:
                    telegram_api_url = f'https://api.telegram.org/bot{text}/getMe'
                    response = requests.get(telegram_api_url, timeout=10)
                    
                    if response.status_code == 200 and response.json().get('ok'):
                        bot_info = response.json()['result']
                        bot_username = bot_info['username']
                        
                        cursor.execute(
                            '''INSERT INTO bots (owner_id, bot_token, bot_username)
                               VALUES (%s, %s, %s)
                               ON CONFLICT (bot_token) DO UPDATE 
                               SET owner_id = EXCLUDED.owner_id, is_active = true
                               RETURNING id''',
                            (str(telegram_user_id), text, bot_username)
                        )
                        bot_id = cursor.fetchone()['id']
                        
                        webhook_url = f"https://functions.poehali.dev/af40ed3c-a51d-4f3f-ae16-ef69f32d3a02?bot_token={text}"
                        requests.post(f'https://api.telegram.org/bot{text}/setWebhook', 
                                    json={'url': webhook_url}, timeout=10)
                        
                        set_user_state(cursor, telegram_user_id, username, 'idle', {})
                        conn.commit()
                        
                        success_text = (
                            f"🎉 <b>Бот @{bot_username} успешно подключен!</b>\n\n"
                            "Теперь пользователи могут писать в него сообщения, "
                            "и вы будете получать их в разделе 'Входящие сообщения'."
                        )
                        send_message(bot_token, chat_id, success_text, get_main_menu_keyboard())
                    else:
                        send_message(bot_token, chat_id, '❌ Неверный токен. Проверьте и попробуйте снова.')
            
            elif current_state == 'waiting_welcome_text':
                bot_id = state_data.get('bot_id')
                if bot_id:
                    cursor.execute(
                        'UPDATE bots SET welcome_text = %s WHERE id = %s AND owner_id = %s',
                        (text, bot_id, str(telegram_user_id))
                    )
                    conn.commit()
                    
                    set_user_state(cursor, telegram_user_id, username, 'idle', {})
                    send_message(bot_token, chat_id, '✅ Текст приветствия обновлён!', get_main_menu_keyboard())
            
            elif current_state == 'waiting_reply':
                message_id = state_data.get('message_id')
                original_chat_id = state_data.get('chat_id')
                user_bot_token = state_data.get('bot_token')
                
                if message_id and original_chat_id and user_bot_token:
                    requests.post(
                        f'https://api.telegram.org/bot{user_bot_token}/sendMessage',
                        json={'chat_id': original_chat_id, 'text': f'📩 Ответ от владельца:\n\n{text}'},
                        timeout=10
                    )
                    
                    set_user_state(cursor, telegram_user_id, username, 'idle', {})
                    send_message(bot_token, chat_id, '✅ Ответ отправлен!', get_main_menu_keyboard())
            
            else:
                send_message(bot_token, chat_id, 'Используйте /start для начала работы.')
        
        elif 'callback_query' in update:
            callback_query = update['callback_query']
            chat_id = callback_query['message']['chat']['id']
            telegram_user_id = callback_query['from']['id']
            username = callback_query['from'].get('username', 'user')
            data = callback_query['data']
            
            requests.post(
                f'https://api.telegram.org/bot{bot_token}/answerCallbackQuery',
                json={'callback_query_id': callback_query['id']},
                timeout=5
            )
            
            if data == 'create_bot':
                set_user_state(cursor, telegram_user_id, username, 'waiting_bot_token', {})
                conn.commit()
                
                instruction_text = (
                    "📝 <b>Создание бота</b>\n\n"
                    "<b>Шаг 1:</b> Откройте @BotFather\n"
                    "<b>Шаг 2:</b> Отправьте /newbot\n"
                    "<b>Шаг 3:</b> Следуйте инструкциям\n"
                    "<b>Шаг 4:</b> Скопируйте токен и отправьте мне\n\n"
                    "Жду токен вашего бота:"
                )
                send_message(bot_token, chat_id, instruction_text)
            
            elif data == 'my_bots':
                cursor.execute(
                    'SELECT id, bot_username, is_active FROM bots WHERE owner_id = %s AND is_active = true',
                    (str(telegram_user_id),)
                )
                bots = cursor.fetchall()
                
                if not bots:
                    send_message(bot_token, chat_id, 'У вас пока нет подключенных ботов.', get_main_menu_keyboard())
                else:
                    buttons = []
                    for bot in bots:
                        buttons.append([
                            {'text': f'@{bot["bot_username"]}', 'callback_data': f'bot_{bot["id"]}'}
                        ])
                    buttons.append([{'text': '◀️ Назад', 'callback_data': 'main_menu'}])
                    
                    send_message(bot_token, chat_id, '🤖 <b>Ваши боты:</b>', {'inline_keyboard': buttons})
            
            elif data.startswith('bot_'):
                bot_id = int(data.split('_')[1])
                cursor.execute(
                    'SELECT bot_username, bot_token FROM bots WHERE id = %s AND owner_id = %s',
                    (bot_id, str(telegram_user_id))
                )
                bot = cursor.fetchone()
                
                if bot:
                    keyboard = {
                        'inline_keyboard': [
                            [{'text': '⚙️ Изменить приветствие', 'callback_data': f'edit_welcome_{bot_id}'}],
                            [{'text': '🔌 Отвязать бота', 'callback_data': f'disconnect_{bot_id}'}],
                            [{'text': '◀️ Назад', 'callback_data': 'my_bots'}]
                        ]
                    }
                    send_message(bot_token, chat_id, f'Бот @{bot["bot_username"]}', keyboard)
            
            elif data.startswith('edit_welcome_'):
                bot_id = int(data.split('_')[2])
                set_user_state(cursor, telegram_user_id, username, 'waiting_welcome_text', {'bot_id': bot_id})
                conn.commit()
                send_message(bot_token, chat_id, 'Отправьте новый текст приветствия:')
            
            elif data.startswith('disconnect_'):
                bot_id = int(data.split('_')[1])
                cursor.execute(
                    'UPDATE bots SET is_active = false WHERE id = %s AND owner_id = %s',
                    (bot_id, str(telegram_user_id))
                )
                conn.commit()
                send_message(bot_token, chat_id, '✅ Бот отвязан', get_main_menu_keyboard())
            
            elif data == 'messages':
                cursor.execute(
                    '''SELECT m.id, m.chat_id, m.username, m.first_name, m.message_text, m.created_at, b.bot_token, b.bot_username
                       FROM messages m
                       JOIN bots b ON m.bot_id = b.id
                       WHERE b.owner_id = %s AND b.is_active = true
                       ORDER BY m.created_at DESC
                       LIMIT 10''',
                    (str(telegram_user_id),)
                )
                messages = cursor.fetchall()
                
                if not messages:
                    send_message(bot_token, chat_id, 'Нет входящих сообщений.', get_main_menu_keyboard())
                else:
                    for msg in messages:
                        username_display = f"@{msg['username']}" if msg['username'] else msg['first_name']
                        msg_text = (
                            f"💬 <b>Сообщение от {username_display}</b>\n"
                            f"📍 Бот: @{msg['bot_username']}\n\n"
                            f"{msg['message_text']}"
                        )
                        keyboard = {
                            'inline_keyboard': [[
                                {'text': '↩️ Ответить', 'callback_data': f'reply_{msg["id"]}_{msg["chat_id"]}'}
                            ]]
                        }
                        send_message(bot_token, chat_id, msg_text, keyboard)
                    
                    send_message(bot_token, chat_id, 'Главное меню:', get_main_menu_keyboard())
            
            elif data.startswith('reply_'):
                parts = data.split('_')
                message_id = int(parts[1])
                original_chat_id = int(parts[2])
                
                cursor.execute(
                    '''SELECT b.bot_token FROM messages m
                       JOIN bots b ON m.bot_id = b.id
                       WHERE m.id = %s AND b.owner_id = %s''',
                    (message_id, str(telegram_user_id))
                )
                result = cursor.fetchone()
                
                if result:
                    set_user_state(cursor, telegram_user_id, username, 'waiting_reply', {
                        'message_id': message_id,
                        'chat_id': original_chat_id,
                        'bot_token': result['bot_token']
                    })
                    conn.commit()
                    send_message(bot_token, chat_id, 'Напишите ваш ответ:')
            
            elif data == 'main_menu':
                set_user_state(cursor, telegram_user_id, username, 'idle', {})
                conn.commit()
                send_message(bot_token, chat_id, 'Главное меню:', get_main_menu_keyboard())
        
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
