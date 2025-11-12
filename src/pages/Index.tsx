import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

type Screen = 'home' | 'create' | 'settings' | 'messages';
type Message = {
  id: number;
  username: string;
  message_text: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
};

type Bot = {
  id: number;
  bot_username: string;
  welcome_text: string;
  is_active: boolean;
  created_at: string;
};

const BOT_MANAGER_URL = 'https://functions.poehali.dev/7a54001b-4010-4175-9428-a7e922d7da84';
const BOT_MESSAGES_URL = 'https://functions.poehali.dev/a23d9b25-8628-485e-893e-7fb977d07046';
const WEBHOOK_URL = 'https://functions.poehali.dev/af40ed3c-a51d-4f3f-ae16-ef69f32d3a02';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [botToken, setBotToken] = useState('');
  const [currentBot, setCurrentBot] = useState<Bot | null>(null);
  const [welcomeText, setWelcomeText] = useState('Привет! Напиши мне сообщение, и я передам его владельцу.');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId] = useState(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', id);
    }
    return id;
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBotData();
  }, []);

  useEffect(() => {
    if (currentBot) {
      loadMessages();
    }
  }, [currentBot]);

  const loadBotData = async () => {
    try {
      const response = await fetch(BOT_MANAGER_URL, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
      });
      const data = await response.json();
      if (data.bots && data.bots.length > 0) {
        setCurrentBot(data.bots[0]);
        setWelcomeText(data.bots[0].welcome_text);
      }
    } catch (error) {
      console.error('Error loading bot:', error);
    }
  };

  const loadMessages = async () => {
    if (!currentBot) return;
    try {
      const response = await fetch(`${BOT_MESSAGES_URL}?bot_id=${currentBot.id}`, {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
      });
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleConnectBot = async () => {
    if (botToken.length < 10) {
      toast({
        title: '❌ Ошибка',
        description: 'Введите корректный токен бота',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(BOT_MANAGER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          bot_token: botToken,
          welcome_text: welcomeText,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentBot(data.bot);
        
        const webhookUrl = `${WEBHOOK_URL}?bot_token=${botToken}`;
        await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        });

        setScreen('home');
        setBotToken('');
        toast({
          title: '🎉 Бот подключен!',
          description: 'Ваш бот успешно активирован и готов к работе',
        });
      } else {
        toast({
          title: '❌ Ошибка',
          description: data.error || 'Не удалось подключить бота',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось подключить бота',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectBot = async () => {
    if (!currentBot) return;

    setLoading(true);
    try {
      const response = await fetch(`${BOT_MANAGER_URL}?bot_id=${currentBot.id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        setCurrentBot(null);
        setMessages([]);
        setScreen('home');
        toast({
          title: 'Бот отвязан',
          description: 'Вы можете подключить новый бот',
        });
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось отвязать бота',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentBot) return;

    setLoading(true);
    try {
      const response = await fetch(BOT_MANAGER_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          bot_id: currentBot.id,
          welcome_text: welcomeText,
        }),
      });

      if (response.ok) {
        setCurrentBot({ ...currentBot, welcome_text: welcomeText });
        toast({
          title: '✅ Настройки сохранены',
          description: 'Текст приветствия обновлен',
        });
        setScreen('home');
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
      <div className="container max-w-4xl mx-auto p-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            🤖 Bot Constructor
          </h1>
          <p className="text-muted-foreground">Создай бота для обратной связи за 3 минуты</p>
        </div>

        {screen === 'home' && (
          <div className="space-y-4 animate-slide-up">
            {!currentBot ? (
              <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Rocket" size={24} className="text-primary" />
                    Начните с создания бота
                  </CardTitle>
                  <CardDescription>Подключите бота через Telegram BotFather</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setScreen('create')} size="lg" className="w-full text-lg">
                    <Icon name="Plus" size={20} className="mr-2" />
                    Создать бота
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-2 border-primary/20 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Icon name="CheckCircle2" size={24} className="text-primary" />
                          Бот @{currentBot.bot_username}
                        </CardTitle>
                        <CardDescription>Выберите действие для управления ботом</CardDescription>
                      </div>
                      <Badge className="bg-primary text-white">
                        <Icon name="Zap" size={14} className="mr-1" />
                        Работает
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card
                    className="cursor-pointer hover:scale-105 transition-transform hover:shadow-lg border-2 hover:border-secondary"
                    onClick={() => setScreen('settings')}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-2 w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
                        <Icon name="Settings" size={32} className="text-secondary" />
                      </div>
                      <CardTitle className="text-lg">⚙️ Настроить</CardTitle>
                      <CardDescription className="text-sm">Изменить тексты и параметры</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card
                    className="cursor-pointer hover:scale-105 transition-transform hover:shadow-lg border-2 hover:border-accent"
                    onClick={() => setScreen('messages')}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-2 w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center relative">
                        <Icon name="MessageSquare" size={32} className="text-accent" />
                        <Badge className="absolute -top-1 -right-1 bg-accent text-white px-2">
                          {messages.length}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">💬 Сообщения</CardTitle>
                      <CardDescription className="text-sm">Просмотр входящих</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card
                    className="cursor-pointer hover:scale-105 transition-transform hover:shadow-lg border-2 hover:border-destructive"
                    onClick={handleDisconnectBot}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className="mx-auto mb-2 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                        <Icon name="Unplug" size={32} className="text-destructive" />
                      </div>
                      <CardTitle className="text-lg">🔌 Отвязать</CardTitle>
                      <CardDescription className="text-sm">Удалить бота</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {screen === 'create' && (
          <div className="space-y-4 animate-scale-in">
            <Button variant="ghost" onClick={() => setScreen('home')} className="mb-4">
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>

            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="BookOpen" size={24} className="text-primary" />
                  Инструкция по созданию бота
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-semibold">Откройте Telegram</p>
                      <p className="text-sm text-muted-foreground">Найдите @BotFather в поиске</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-semibold">Создайте бота</p>
                      <p className="text-sm text-muted-foreground">
                        Отправьте команду <code className="bg-background px-2 py-1 rounded">/newbot</code>
                      </p>
                      <p className="text-sm text-muted-foreground">Следуйте инструкциям BotFather</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-semibold">Скопируйте токен</p>
                      <p className="text-sm text-muted-foreground">
                        BotFather отправит токен вида: <br />
                        <code className="bg-background px-2 py-1 rounded text-xs">
                          123456789:ABCdefGHIjklMNOpqrsTUVwxyz
                        </code>
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-semibold">Вставьте токен ниже</p>
                      <p className="text-sm text-muted-foreground">И нажмите кнопку "Подключить"</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-sm font-medium">Токен вашего бота</label>
                  <Input
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={handleConnectBot} size="lg" className="w-full" disabled={loading}>
                    <Icon name="Link" size={20} className="mr-2" />
                    {loading ? 'Подключение...' : 'Подключить бота'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {screen === 'settings' && (
          <div className="space-y-4 animate-scale-in">
            <Button variant="ghost" onClick={() => setScreen('home')} className="mb-4">
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>

            <Card className="border-2 border-secondary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Settings" size={24} className="text-secondary" />
                  Настройки бота
                </CardTitle>
                <CardDescription>Настройте текст приветствия для пользователей</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Текст приветствия</label>
                  <Textarea
                    value={welcomeText}
                    onChange={(e) => setWelcomeText(e.target.value)}
                    rows={4}
                    placeholder="Введите текст приветствия..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Этот текст увидят пользователи при нажатии /start
                  </p>
                </div>

                <Button onClick={handleSaveSettings} size="lg" className="w-full bg-secondary hover:bg-secondary/90" disabled={loading}>
                  <Icon name="Save" size={20} className="mr-2" />
                  {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {screen === 'messages' && (
          <div className="space-y-4 animate-scale-in">
            <Button variant="ghost" onClick={() => setScreen('home')} className="mb-4">
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>

            <Card className="border-2 border-accent/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Inbox" size={24} className="text-accent" />
                  Входящие сообщения
                  <Badge className="bg-accent text-white ml-auto">{messages.length}</Badge>
                </CardTitle>
                <CardDescription>Сообщения от пользователей вашего бота</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="MessageSquare" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Пока нет сообщений</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <Card key={message.id} className="bg-muted/50 hover:bg-muted transition-colors">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                              <Icon name="User" size={20} className="text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">
                                {message.username ? `@${message.username}` : `${message.first_name || ''} ${message.last_name || ''}`.trim() || 'Пользователь'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm bg-background p-3 rounded-lg">{message.message_text}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;