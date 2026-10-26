# Architecture review

| Principle | Evidence (file:line) | Practical risk | Fix |
|---|---|---|---|
| **Information Hiding** | `checkout/CheckoutController.ts` (рядки 20-26, створення `stripePayload`) | Транспортний рівень (контролер) знає специфічний формат даних зовнішнього провайдера (Stripe). Додавання нового провайдера змусить змінювати контролер. | Контролер має передавати лише загальні дані (`paymentToken`, `currency`), а формування payload для конкретного провайдера має відбуватися всередині модуля `Payments`. |
| **Explicit Contracts / Low Coupling** | `orders/OrderService.ts` (рядок 4 та конструктор, жорстка залежність від `StripeClient`) | Модуль замовлень напряму залежить від конкретної реалізації платіжного шлюзу. Неможливо додати фейкового провайдера для тестів без зміни коду замовлень. | Сховати провайдерів за загальним інтерфейсом (наприклад, `PaymentProvider` або єдиним фасадом `PaymentsService`), який інжектитиметься в `OrderService`. |
| **Ownership** | `orders/OrderService.ts` (рядки 21-25, прямий запис у `database.stock.set`) | `OrderService` порушує межі модуля `Inventory`, самостійно змінюючи його стан бази. Це дозволяє обійти бізнес-правила інвентаризації та ускладнює зміну структури БД складу. | Створити метод `decreaseStock` (або `reserveStock`) у `StockRepository` і викликати його, щоб `Inventory` сам керував своїми даними. |
| **Dependency Direction** | `payments/internal/StripeClient.ts` (рядки 2 та 20, виклик `markOrderPaid`) | Модуль платежів знає про внутрішню структуру модуля замовлень і мутує його стан. Це створює циклічну залежність (Orders -> Payments -> Orders). | `StripeClient` має лише повертати результат (response) викликаючій стороні (`OrderService`), а вже Orders має оновлювати статус замовлення. |
| **Local Reasoning** | `shared/calculateTotal.ts` (рядки 15, 20, читання глобальних змінних та мутація `lines`) | Функція має приховані залежності (`runtimeConfig`), побічні ефекти (`auditLog`) і непомітно змінює вхідний масив, що робить її непередбачуваною для юніт-тестів. | Передавати конфігурацію як аргументи; повертати новий об'єкт без мутації `lines`; винести логування за межі функції розрахунку. |
| **High Cohesion** | `orders/mapPaymentStatus.ts` (а також копії в `reports/` та `notifications/`) | Логіка мапінгу статусів Stripe розкидана по трьох різних модулях. Додавання нового статусу `processing` вимагатиме синхронних змін у трьох місцях. | Створити єдину функцію мапінгу всередині модуля `Payments`, яка повертатиме іншим модулям вже нормалізований статус системи. |

## Change impact prediction (заповнити до реалізації change request)

**Requirement:**
Система повинна підтримати другий навчальний payment provider і новий нормалізований статус `processing`. Provider-specific payload не має поширюватися за межі `Payments`.

**Expected files:**
- `checkout/CheckoutController.ts` (видалення stripePayload)
- `orders/OrderService.ts` (перехід на абстрактний фасад Payments, видалення StripeClient)
- Всі `mapPaymentStatus.ts` (видалення дублів, перенесення в Payments)
- `payments/PaymentsService.ts` (новий фасад/інтерфейс)
- `payments/internal/FakeProvider.ts` (новий)
- `payments/internal/StripeClient.ts` (прибирання виклику OrderMutations)
- `tests/checkout.functional.test.ts` (додавання нових тестів для processing та unknown)

**Modules that should not change:**
- `inventory/*` (інвентаризація не стосується провайдерів платежів)
- `shared/calculateTotal.ts` (правила розрахунку залишаються незмінними для цього CR)
- Публічні контракти та API-відповідь (структура Checkout API залишається незмінною)

## Actual impact (заповнити після реалізації)

**Actual files changed:**
- `src/checkout/CheckoutController.ts`
- `src/orders/OrderService.ts`
- `src/payments/internal/StripeClient.ts`
- `src/payments/PaymentsService.ts` (новий)
- `src/payments/internal/FakeProvider.ts` (новий)
- `tests/payments.unit.test.ts` (новий)
- Видалені: дублікати `mapPaymentStatus.ts` та `orderMutations.ts`.

**Difference from prediction and explanation:**
Прогноз виявився дуже точним. Єдина відмінність: замість додавання тестів до існуючого `checkout.functional.test.ts`, було створено окремий ізольований файл `payments.unit.test.ts` суто для юніт-тестування нормалізації статусів (як того вимагає рівень 60). Усі очікувані модулі (`Inventory`, `shared`) залишилися без змін, підтвердивши правильність нових меж.
