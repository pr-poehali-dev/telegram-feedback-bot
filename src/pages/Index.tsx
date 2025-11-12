import { useState } from 'react';
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
  id: string;
  username: string;
  text: string;
  date: string;
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [botToken, setBotToken] = useState('');
  const [botConnected, setBotConnected] = useState(false);
  const [welcomeText, setWelcomeText] = useState('Привет! Напиши мне сообщение, и я передам его владельцу.');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', username: 'user123', text: 'Здравствуйте! У меня вопрос по вашему продукту', date: '2025-11-12 14:30' },
    { id: '2', username: 'alex_m', text: 'Когда будет следующая поставка?', date: '2025-11-12 15:45' },
    { id: '3', username: 'maria_k', text: 'Спасибо за быстрый ответ!', date: '2025-11-12 16:20' },
  ]);
  const { toast } = useToast();

  const handleConnectBot = () => {
    if (botToken.length > 10) {
      setBotConnected(true);
      setScreen('home');
      toast({
        title: '🎉 Бот подключен!',
        description: 'Ваш бот успешно активирован и готов к работе',
      });
    } else {
      toast({
        title: '❌ Ошибка',
        description: 'Введите корректный токен бота',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectBot = () => {
    setBotConnected(false);
    setBotToken('');
    setScreen('home');
    toast({
      title: 'Бот отвязан',
      description: 'Вы можете подключить новый бот',
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: '✅ Настройки сохранены',
      description: 'Текст приветствия обновлен',
    });
    setScreen('home');
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
            {!botConnected ? (
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
                      <CardTitle className="flex items-center gap-2">
                        <Icon name="CheckCircle2" size={24} className="text-primary" />
                        Бот активен
                      </CardTitle>
                      <Badge className="bg-primary text-white">
                        <Icon name="Zap" size={14} className="mr-1" />
                        Работает
                      </Badge>
                    </div>
                    <CardDescription>Выберите действие для управления ботом</CardDescription>
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
                  <Button onClick={handleConnectBot} size="lg" className="w-full">
                    <Icon name="Link" size={20} className="mr-2" />
                    Подключить бота
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

                <Button onClick={handleSaveSettings} size="lg" className="w-full bg-secondary hover:bg-secondary/90">
                  <Icon name="Save" size={20} className="mr-2" />
                  Сохранить изменения
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
                              <p className="font-semibold">@{message.username}</p>
                              <p className="text-xs text-muted-foreground">{message.date}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Icon name="Reply" size={16} className="mr-1" />
                            Ответить
                          </Button>
                        </div>
                        <p className="text-sm bg-background p-3 rounded-lg">{message.text}</p>
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