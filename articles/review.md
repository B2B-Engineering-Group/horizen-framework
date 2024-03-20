# Процесс сдачи-приемки работ

Чтобы успешно сдать работу вам необходимо держать в голове этапы и значимые критерии, а также выстроить процесс разработки ориентируясь на них. 
 
## Этап 1 - Проверка бизнес-логики 

⚠️ Подоготовьте видео-обзор результата работ. Он должен содержать ответы на следующие вопросы:

---


**1. Что вообще за модуль нам сдали и что он должен делать?**

Коллеги, принимающие вашу задачу, как правило, находятся во множестве контекстов. Тот кто проверяет, вероятно, либо не вникал в вашу задачу, либо уже забыл некоторые детали. Помогите ему понять о чем идет речь, желательно максимально подробно. Покажите текст ТЗ, уточните какие вещи были дополнительно согласованы.

---

**2. Выполняет(ют) ли модуль(и) свою задачу?**

У каждого микросервиса есть некие сырые данные и способ их импорта, а также результат работы и способ экспорта. Вам необходимо продемонстрировать всю цепочку максимально подробно. Хорошо прописанные E2E тесты, в том числе наполняющие тестовую базу, выполняют роль огромного помощника в этом вопросе.

Например: 
* Если вы пишите генератор видео из каких-то промо-материалов. Покажите исходные данные для генерации, а также покажите конечный результат.  

* Если вы делаете какой-то front-end модуль, покажите все основные цепочки которые проходит пользователь, т.е заполняет какие-то формы, как система на это реагирует и в каком формате эти данные хранятся в базе данных. 

Т.е вам необходимо переключиться из режима разработчика в режим пользователя и показать, что все работает как запланировано, воссоздав для этого все необходимые условия. Наиболее частая ошибка - это недоделанная работа, пройдя весь путь вы, вероятно, самостоятельно обнаружите ряд проблем.

---

**3. Правильно ли построены интерфейсы (API / Front-end) и модель базы данных?**

Каждый модуль имеет самодостаточный интерфейс, но для того чтобы интегрировать модуль в общую систему, нам необходимо удостовериться, что текущих интерфейсов достаточно, а также, что структура хранения данных в модуле позволит легко добавлять новые интерфейсы если это потребуется. 

Покажите API контроллеры, их схемы запросов и ответов, покажите объекты в которых храните данные и E2E тесты. Если у модуля есть Front-end покажите его во всех состояниях: пустой, заполненный, переполненный. Если в задаче требовалась мобильная версия, также покажите ее во всех состояниях, включив в браузере режим эмуляции мобильного устройства. 

Т.е задумайтесь о том как данный модуль будет интегрироваться в будущем и заложились на это при разработке.

--- 

**4. Правильно ли конфигурируется модуль?**

Мы стараемся делать универсальные микросервисы, которые можно переиспользовать. Такие микросервисы чаще всего конфигурируются через файл config.json. Покажите этот файл, расскажите какие опции добавили и как они влияют на работу микросервиса.

---

**5. Какие узкие зоны и допущения есть в алгоритмах модуля?**

Если вы пишите что-то сложнее формочки для заполнения данных, а ваш модуль работает с файлами, внешними API или проводит какие-то операции с датасетами, то в этих зонах часто есть места для потенциальных багов. Проведите стресс-тесты: попробуйте загрузить большие или битые файлы, попробуйте превысить лимит запросов к внешнему API, подумайте о том при каких ситуациях ваш модуль сломается и насколько эти ситуации вероятны. И по итогу сформируйте и озвучьте список допущений которые были выявлены, вероятно вы сразу поймете какие из них необходимо исправить. 

---

**6. Проходят ли тесты без ошибок?**

Покажите что все тесты прошли без ошибок, расскажите какие зоны не покрыты тестами и почему.



 
## Этап 2 - Обзор написанного кода

Если по результатам демонстрации недочетов не выявлено, мы проведем исследование следующих вопросов:

6) Соответствует ли написанный код стандарту фреймворка, мы сможем его поддерживать?
7) Где разработчик не увидел потенциальных проблем или что-то не учел?
8) Проходит ли CI/CD цикл по новому модулю?
9) Работает ли модуль в production окружении также как на демонстрации?

При необходимости отправим список доработок с разьяснениями.


 
## Этап 3 - Оплата и подписание актов
Когда микросервис прошел все этапы исследования, он принимается и оплачивается. От вас потребуется только подтвердить получение средств, расписавшись в акте сдачи-приемки. 