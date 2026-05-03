--
-- PostgreSQL database dump
--

\restrict tZPsCTOHr8apgjUElncTxlQxrTSjFD2Lt9fhnlqbN9tVJKFTJub6dLWBpnQVb5l

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    client_id integer CONSTRAINT cart_items_user_id_not_null NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    added_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cart_items_id_seq OWNER TO postgres;

--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    patronymic character varying(50),
    phone character varying(20) NOT NULL,
    address text NOT NULL,
    email character varying(100),
    payment_details text
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: courier_phones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courier_phones (
    id integer NOT NULL,
    courier_id integer NOT NULL,
    phone_number character varying(20) NOT NULL
);


ALTER TABLE public.courier_phones OWNER TO postgres;

--
-- Name: courier_phones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courier_phones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courier_phones_id_seq OWNER TO postgres;

--
-- Name: courier_phones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courier_phones_id_seq OWNED BY public.courier_phones.id;


--
-- Name: couriers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.couriers (
    id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    patronymic character varying(50),
    employment_status character varying(20) NOT NULL,
    transport_type character varying(30) NOT NULL,
    CONSTRAINT couriers_employment_status_check CHECK (((employment_status)::text = ANY (ARRAY[('свободен'::character varying)::text, ('занят'::character varying)::text]))),
    CONSTRAINT couriers_transport_type_check CHECK (((transport_type)::text = ANY (ARRAY[('авто'::character varying)::text, ('велосипед'::character varying)::text, ('пеший'::character varying)::text, ('электротранспорт'::character varying)::text])))
);


ALTER TABLE public.couriers OWNER TO postgres;

--
-- Name: couriers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.couriers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.couriers_id_seq OWNER TO postgres;

--
-- Name: couriers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.couriers_id_seq OWNED BY public.couriers.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    patronymic character varying(50),
    "position" character varying(50) NOT NULL,
    phone character varying(20),
    email character varying(100),
    hire_date date NOT NULL,
    is_active boolean DEFAULT true,
    CONSTRAINT employees_position_check CHECK ((("position")::text = ANY (ARRAY[('оператор'::character varying)::text, ('менеджер'::character varying)::text, ('администратор'::character varying)::text])))
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    price numeric(12,2) CONSTRAINT order_items_price_at_order_not_null NOT NULL,
    CONSTRAINT order_items_price_at_order_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: COLUMN order_items.price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.order_items.price IS 'Цена товара на момент оформления заказа (фиксируется)';


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_picking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_picking (
    id integer NOT NULL,
    order_id integer NOT NULL,
    operator_id integer NOT NULL,
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    completed boolean DEFAULT false
);


ALTER TABLE public.order_picking OWNER TO postgres;

--
-- Name: order_picking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_picking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_picking_id_seq OWNER TO postgres;

--
-- Name: order_picking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_picking_id_seq OWNED BY public.order_picking.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    client_id integer NOT NULL,
    courier_id integer,
    delivery_price numeric(12,2),
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivery_date timestamp without time zone,
    delivery_address text NOT NULL,
    status_id integer CONSTRAINT orders_status_not_null NOT NULL,
    products_total numeric(12,2) DEFAULT 0,
    warehouse_id integer NOT NULL,
    operator_created boolean DEFAULT false,
    CONSTRAINT orders_delivery_price_check CHECK ((delivery_price >= (0)::numeric)),
    CONSTRAINT orders_products_total_check CHECK ((products_total >= (0)::numeric))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    payment_type character varying(30) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_payment_type_check CHECK (((payment_type)::text = ANY (ARRAY[('наличными'::character varying)::text, ('картой'::character varying)::text, ('онлайн'::character varying)::text]))),
    CONSTRAINT payments_total_amount_check CHECK ((total_amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    product_name character varying(200) NOT NULL,
    weight_kg numeric(10,2) NOT NULL,
    volume_m3 numeric(10,6) NOT NULL,
    base_price numeric(12,3) NOT NULL,
    category character varying(100),
    discount_percent numeric(5,2) DEFAULT 0,
    manufacturer character varying(100),
    supplier character varying(100),
    description text,
    stock_quantity integer DEFAULT 0,
    unit character varying(20) DEFAULT 'шт.'::character varying,
    image_url character varying(500),
    CONSTRAINT products_base_price_check CHECK ((base_price >= (0)::numeric)),
    CONSTRAINT products_volume_m3_check CHECK ((volume_m3 > (0)::numeric)),
    CONSTRAINT products_weight_kg_check CHECK ((weight_kg > (0)::numeric))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: routes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    order_id integer NOT NULL,
    start_point text NOT NULL,
    end_point text NOT NULL,
    sending_time timestamp without time zone NOT NULL,
    delivery_time timestamp without time zone
);


ALTER TABLE public.routes OWNER TO postgres;

--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.routes_id_seq OWNER TO postgres;

--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.status (
    id integer NOT NULL,
    status character varying
);


ALTER TABLE public.status OWNER TO postgres;

--
-- Name: status_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.status_id_seq OWNER TO postgres;

--
-- Name: status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.status_id_seq OWNED BY public.status.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    login character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    client_id integer,
    courier_id integer,
    employee_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    CONSTRAINT single_profile_check CHECK ((((client_id IS NOT NULL) AND (courier_id IS NULL) AND (employee_id IS NULL)) OR ((client_id IS NULL) AND (courier_id IS NOT NULL) AND (employee_id IS NULL)) OR ((client_id IS NULL) AND (courier_id IS NULL) AND (employee_id IS NOT NULL))))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    address text NOT NULL,
    is_active boolean DEFAULT true
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouses_id_seq OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: courier_phones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courier_phones ALTER COLUMN id SET DEFAULT nextval('public.courier_phones_id_seq'::regclass);


--
-- Name: couriers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.couriers ALTER COLUMN id SET DEFAULT nextval('public.couriers_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_picking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_picking ALTER COLUMN id SET DEFAULT nextval('public.order_picking_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: status id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status ALTER COLUMN id SET DEFAULT nextval('public.status_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cart_items (id, client_id, product_id, quantity, added_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, first_name, last_name, patronymic, phone, address, email, payment_details) FROM stdin;
1	Алексей	Смирнов	Иванович	79161234567	ул. Ленина, 10-5	alex@mail.ru	Сбербанк ****1234
2	Мария	Кузнецова	Сергеевна	79162345678	пр. Мира, 25-12	maria@yandex.ru	Тинькофф ****5678
3	Дмитрий	Попов	Александрович	79163456789	ул. Пушкина, 7-3	dmitry@gmail.com	Альфа ****9012
4	Елена	Васильева	Владимировна	79164567890	ул. Гагарина, 15-8	elena@mail.ru	ВТБ ****3456
5	Сергей	Петров	Николаевич	79165678901	ул. Советская, 3-21	sergey@yandex.ru	Сбербанк ****7890
6	Анна	Федорова	Дмитриевна	79166789012	ул. Кирова, 12-4	anna@mail.ru	Газпромбанк ****2345
7	Игорь	Михайлов	Викторович	79167890123	ул. Чехова, 5-9	igor@gmail.com	Райффайзен ****6789
8	Ольга	Новикова	Алексеевна	79168901234	ул. Горького, 18-7	olga@yandex.ru	Открытие ****0123
9	Павел	Морозов	Сергеевич	79169012345	ул. Садовая, 9-15	pavel@mail.ru	Сбербанк ****4567
10	Татьяна	Волкова	Ивановна	79170123456	ул. Цветочная, 22-3	tanya@gmail.com	Тинькофф ****8901
11	Андрей	Зайцев	Петрович	79171234567	ул. Лесная, 14-6	andrey@mail.ru	Альфа ****2345
12	Юлия	Павлова	Андреевна	79172345678	ул. Молодежная, 8-11	yulia@yandex.ru	ВТБ ****6789
13	Владимир	Семенов	Олегович	79173456789	ул. Речная, 17-9	vladimir@gmail.com	Сбербанк ****0123
14	Екатерина	Голубева	Викторовна	79174567890	ул. Солнечная, 6-14	katya@mail.ru	Газпромбанк ****4567
15	Николай	Виноградов	Александрович	79175678901	ул. Парковая, 11-2	nikolay@yandex.ru	Открытие ****8901
16	Светлана	Романова	Денисовна	79176789012	ул. Зеленая, 19-8	sveta@gmail.com	Райффайзен ****2345
17	Артем	Козлов	Игоревич	79177890123	ул. Северная, 13-5	artem@mail.ru	Тинькофф ****6789
18	Наталья	Лебедева	Сергеевна	79178901234	ул. Южная, 4-12	natalia@yandex.ru	Альфа ****0123
19	Максим	Соловьев	Владимирович	79179012345	ул. Восточная, 16-7	maxim@gmail.com	ВТБ ****4567
20	Ирина	Егорова	Анатольевна	79180123456	ул. Западная, 2-10	irina@mail.ru	Сбербанк ****8901
21	Артём	Манаенко	Алексеевич	89292267288	Шадринск островского 4/1	Artemmanaenko05@gmail.com	\N
22	Артём	Манаенко	\N	89292267282		Artemmanaenko0@gmail.com	\N
\.


--
-- Data for Name: courier_phones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courier_phones (id, courier_id, phone_number) FROM stdin;
\.


--
-- Data for Name: couriers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.couriers (id, first_name, last_name, patronymic, employment_status, transport_type) FROM stdin;
3	Антон	Петров	Алексеевич	свободен	электротранспорт
5	Алексей	Соколов	Дмитриевич	свободен	пеший
6	Денис	Волков	Игоревич	свободен	велосипед
11	Роман	Захаров	Сергеевич	свободен	авто
13	Григорий	Макаров	Викторович	свободен	пеший
14	Олег	Ковалев	Денисович	свободен	авто
16	Владимир	Белов	Петрович	свободен	электротранспорт
19	Павел	Филиппов	Сергеевич	свободен	велосипед
20	Борис	Давыдов	Анатольевич	свободен	авто
8	Андрей	Морозов	Владимирович	свободен	электротранспорт
10	Артем	Никитин	Олегович	свободен	велосипед
2	Петр	Иванов	Сергеевич	свободен	велосипед
4	Михаил	Кузнецов	Викторович	свободен	авто
7	Сергей	Федоров	Николаевич	свободен	авто
12	Виктор	Борисов	Андреевич	свободен	электротранспорт
15	Николай	Орлов	Ильич	свободен	велосипед
18	Юрий	Степанов	Владимирович	свободен	пеший
1	Иван	Сидоров	Петрович	свободен	авто
17	Дмитрий	Алексеев	Михайлович	свободен	авто
9	Константин	Егоров	Александрович	занят	пеший
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, first_name, last_name, patronymic, "position", phone, email, hire_date, is_active) FROM stdin;
1	Иван	Петров	Сергеевич	администратор	79001112233	admin@delivery.ru	2023-01-14	t
2	Анна	Сидорова	Андреевна	менеджер	79002223345	manager@delivery.ru	2023-02-19	t
3	Ольга	Иванова	Дмитриевна	оператор	79003334455	operator1@delivery.ru	2023-03-09	t
4	Сергей	Кузнецов	Викторович	оператор	79004445566	operator2@delivery.ru	2023-04-04	t
5	Мария	Смирнова	Алексеевна	менеджер	79005556677	manager2@delivery.ru	2023-05-11	t
6	Дмитрий	Попов	Игоревич	оператор	79006667788	operator3@delivery.ru	2023-06-17	t
7	Елена	Васильева	Николаевна	администратор	79007778899	admin2@delivery.ru	2023-07-24	t
8	Андрей	Новиков	Олегович	оператор	79008889900	operator4@delivery.ru	2023-08-29	t
9	Наталья	Морозова	Сергеевна	менеджер	79009990011	manager3@delivery.ru	2023-09-13	t
10	Павел	Волков	Петрович	оператор	79001001122	operator5@delivery.ru	2023-10-21	t
11	Татьяна	Алексеева	Владимировна	администратор	79001112234	admin3@delivery.ru	2023-11-04	t
12	Владимир	Лебедев	Александрович	оператор	79002223344	operator6@delivery.ru	2023-12-09	t
13	Юлия	Семенова	Игоревна	менеджер	79003334457	manager4@delivery.ru	2024-01-14	t
14	Михаил	Козлов	Денисович	оператор	79004445567	operator7@delivery.ru	2024-02-19	t
15	Ольга	Зайцева	Анатольевна	администратор	79005556678	admin4@delivery.ru	2024-03-09	t
16	Игорь	Григорьев	Васильевич	оператор	79006567788	operator8@delivery.ru	2024-04-04	t
17	Светлана	Борисова	Павловна	менеджер	79006778899	manager5@delivery.ru	2025-05-11	t
18	Роман	Киселев	Андреевич	оператор	79008889990	operator9@delivery.ru	2025-06-17	t
19	Екатерина	Воробьева	Сергеевна	администратор	79009990211	admin5@delivery.ru	2025-07-24	t
20	Артем	Тимофеев	Ильич	оператор	79001001422	operator10@delivery.ru	2025-08-29	t
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity, price) FROM stdin;
1	1	1	1	67500.00
2	2	2	1	85405.00
3	3	3	1	12000.00
4	4	4	5	800.00
6	6	6	1	4000.00
7	7	7	1	25000.00
8	8	8	3	1500.00
9	9	9	1	13500.00
10	10	10	1	9500.00
11	11	11	1	4050.00
12	12	12	1	3200.00
13	13	13	2	12000.00
14	14	14	1	14700.00
15	15	15	1	18000.00
16	16	16	10	845.50
18	18	18	2	2125.00
19	19	19	1	2800.00
20	20	20	1	4080.00
17	17	17	1	80.00
5	5	5	1	102.00
32	27	16	1	845.50
33	27	6	1	4000.00
34	27	9	1	13500.00
35	27	14	3	14700.00
36	27	26	1	350.00
37	27	2	1	85405.00
38	29	16	1	845.50
39	30	17	1	80.00
40	30	8	1	1500.00
44	32	5	1	102.00
45	32	3	1	12000.00
46	32	4	1	800.00
47	33	6	1	4000.00
48	33	11	1	4050.00
49	33	9	1	13500.00
\.


--
-- Data for Name: order_picking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_picking (id, order_id, operator_id, started_at, finished_at, completed) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, client_id, courier_id, delivery_price, order_date, delivery_date, delivery_address, status_id, products_total, warehouse_id, operator_created) FROM stdin;
10	10	10	220.00	2025-01-19 06:45:00	2026-04-05 23:47:50.067253	ул. Цветочная, д. 22, кв. 3	4	9500.00	1	\N
27	2	10	440.00	2026-04-05 23:37:44.933633	2026-04-05 23:47:53.832828	Островского 4/1	4	0.00	1	\N
12	12	12	200.00	2025-01-21 09:00:00	2026-04-05 23:53:01.710646	ул. Молодежная, д. 8, кв. 11	4	3200.00	1	\N
13	13	13	1200.00	2025-01-22 03:00:00	2026-04-05 23:53:01.710646	ул. Речная, д. 17, кв. 9	4	24000.00	1	\N
3	2	3	250.00	2025-01-12 09:20:00	2025-12-28 23:00:57.118	ул. Пушкина, д. 7, кв. 3	4	12000.00	1	\N
1	1	1	500.00	2025-01-10 04:30:00	2025-01-10 10:00:00	ул. Ленина, д. 10, кв. 5	4	67500.00	1	\N
5	5	5	600.00	2025-01-14 04:00:00	2025-01-14 08:00:00	ул. Советская, д. 3, кв. 21	4	102.00	1	\N
7	7	7	450.00	2025-01-16 07:30:00	2025-01-16 13:00:00	ул. Чехова, д. 5, кв. 9	4	25000.00	1	\N
9	9	9	280.00	2025-01-18 05:00:00	2025-01-18 09:30:00	ул. Садовая, д. 9, кв. 15	4	13500.00	1	\N
11	11	11	700.00	2025-01-20 04:30:00	2025-01-20 12:00:00	ул. Лесная, д. 14, кв. 6	4	4050.00	1	\N
14	14	14	320.00	2025-01-23 10:20:00	2025-01-23 14:00:00	ул. Солнечная, д. 6, кв. 14	4	14700.00	1	\N
16	16	16	420.00	2025-01-25 06:00:00	2025-01-25 11:45:00	ул. Зеленая, д. 19, кв. 8	4	8455.00	1	\N
18	18	18	270.00	2025-01-27 08:40:00	2025-01-27 13:20:00	ул. Южная, д. 4, кв. 12	4	4250.00	1	\N
2	3	2	300.00	2025-01-11 06:00:00	2025-01-11 11:30:00	пр. Мира, д. 25, кв. 12	4	85405.00	1	\N
4	4	4	400.00	2025-01-13 05:15:00	2025-12-28 23:56:51.441	ул. Гагарина, д. 15, кв. 8	4	4000.00	1	\N
6	6	6	350.00	2025-01-15 11:45:00	\N	ул. Кирова, д. 12, кв. 4	5	4000.00	1	\N
15	15	15	380.00	2025-01-24 07:10:00	2026-04-05 23:53:01.710646	ул. Парковая, д. 11, кв. 2	4	18000.00	1	\N
17	17	17	350.00	2025-01-26 05:30:00	2026-04-05 23:53:01.710646	ул. Северная, д. 13, кв. 5	4	80.00	1	\N
19	19	19	310.00	2025-01-28 04:15:00	2026-04-05 23:53:01.710646	ул. Восточная, д. 16, кв. 7	4	2800.00	1	\N
20	20	20	290.00	2025-01-29 12:00:00	2026-04-05 23:53:01.710646	ул. Западная, д. 2, кв. 10	4	4080.00	1	\N
8	8	8	300.00	2025-01-17 08:20:00	2026-04-05 23:45:47.463865	ул. Горького, д. 18, кв. 7	4	4500.00	1	\N
29	1	1	220.00	2026-04-05 23:54:57.549922	2026-04-05 23:55:57.435224	Островского 4/1	4	0.00	1	\N
32	21	1	260.00	2026-04-06 10:44:42.759216	\N	Островского 4/1	5	0.00	1	\N
30	4	17	240.00	2026-04-06 10:13:24.909266	2026-04-12 23:42:58.08212	Островского 4/1	4	0.00	1	\N
33	1	9	360.00	2026-04-12 23:43:49.550531	\N	Островского 4/1	2	0.00	1	\N
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, total_amount, payment_type, payment_date) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, product_name, weight_kg, volume_m3, base_price, category, discount_percent, manufacturer, supplier, description, stock_quantity, unit, image_url) FROM stdin;
22	Яйца куриные 10 шт	0.60	0.000600	120.000	Продукты	5.00	Птицефабрика	Продуктовый склад	Яйца куриные категории С0, упаковка 10 штук	25	уп.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
21	Хлеб белый	0.50	0.000500	60.000	Продукты	0.00	Хлебозавод №1	Хлебный цех	Свежий белый хлеб, вес 500г	49	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
23	Ручка шариковая	0.01	0.000010	25.000	Канцелярия	0.00	ErichKrause	Канцелярский магазин	Шариковая ручка синего цвета	150	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
24	Гречка 1кг	1.00	0.001200	110.000	Продукты	0.00	Зернопродукт	Продуктовый склад	Гречневая крупа, 1 кг	40	пак.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
25	Макароны 500г	0.50	0.000800	85.000	Продукты	0.00	Макаронная фабрика	Продуктовый склад	Макароны спагетти, 500г	30	уп.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
18	Сувенирная тарелка	0.80	0.001000	2500.000	Другое	15.00	Производитель	Сувенирный отдел	Сувенирная фарфоровая тарелка с рисунком, диаметр 25 см	30	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
13	Стул офисный	8.00	0.020000	12000.000	Дом и сад	0.00	Производитель	Мебельный магазин	Офисный стул с регулировкой высоты и наклона, сетчатая спинка	9	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
10	Крем для лица увлажняющий	1.50	0.001500	9500.000	Косметика	0.00	L'Oreal	Косметический магазин	Увлажняющий крем для лица, 50 мл	22	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
12	Таблетки Нурофен 10 шт	0.50	0.000500	3200.000	Здоровье	0.00	Фармацевтический завод	Аптека	Обезболивающие таблетки Нурофен, 10 штук	50	уп.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
8	Игрушка мягкая	0.50	0.002000	1500.000	Игрушки	0.00	Производитель	Детский мир	Мягкая игрушка "Медведь", высота 40 см, материал - плюш, гипоаллергенный	39	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
3	Платье вечернее	0.80	0.001000	12000.000	Одежда	0.00	Производитель	Бутик "Элит"	Вечернее платье черного цвета, длина до пола, материал - шифон	24	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
15	Наушники Sony	0.40	0.000300	18000.000	Электроника	0.00	Sony	Салон аудиотехники	Беспроводные наушники Sony с шумоподавлением, время работы до 30 часов	6	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
5	Рис белый 1кг	1.00	0.001500	120.000	Продукты	15.00	Зернопродукт	Продуктовый склад	Рис белый шлифованный, 1 кг	34	пак.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
4	Книга "Война и мир"	1.20	0.001000	800.000	Книги	0.00	Издательство "Классика"	Книжный магазин "Читай-город"	Классическое издание романа Льва Толстого "Война и мир" в твердом переплете	49	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
1	Ноутбук ASUS X515	2.50	0.003000	75000.000	Электроника	99.90	ASUS	ООО 	Ноутбук ASUS X515 с диагональю 15.6 дюймов, процессор Intel Core i5, 8 ГБ ОЗУ, SSD 512 ГБ	199	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
11	Гантели 10 кг	10.00	0.010000	4500.000	Спорт	10.00	Производитель	Спортивный склад	Разборные гантели 10 кг каждая, прорезиненные ручки, металлические диски	13	кг	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
19	Энциклопедия	3.50	0.003000	2800.000	Книги	0.00	Издательство "Знание"	Издательский дом	Энциклопедия "Всемирная история" в 10 томах, твердый переплет	12	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
20	Горшок с цветами	4.00	0.005000	6800.000	Цветы	40.00	Производитель	Цветочный питомник	Горшок с комнатным растением "Фикус Бенджамина", высота 50 см	0	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
16	Блокнот А5	0.30	0.000200	890.000	Канцелярия	5.00	ErichKrause	Канцелярский магазин	Блокнот формата А5, 100 листов	78	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
17	Молоко 1л	1.03	0.001000	80.000	Продукты	0.00	Молочный комбинат	Молочная база	Пастеризованное молоко 1 литр, жирность 3.2%	29	л	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
7	Монитор LG 27"	6.00	0.008000	25000.000	Электроника	0.00	LG	ООО "Электроника+"	Монитор LG 27 дюймов, разрешение 4K, время отклика 1 мс, поддержка HDR	7	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
6	Букет роз	3.00	0.004000	5000.000	Цветы	20.00	Производитель	Цветочный рынок	Свежий букет из 25 красных роз с зеленью, упакован в крафтовую бумагу	9	букет(ов)	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
14	Куртка зимняя	2.00	0.003000	21000.000	Одежда	30.00	Производитель	Одежда "Экстрим"	Зимняя куртка с утеплителем, водоотталкивающая ткань, капюшон	8	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
26	Тоник для лица	0.20	0.000200	350.000	Косметика	0.00	L'Oreal	Косметический магазин	Очищающий тоник для лица, 200 мл	24	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
2	Смартфон iPhone 15	0.30	0.000200	89900.000	Электроника	5.00	Apple	ИП Иванов А.В.	Смартфон iPhone 15 с дисплеем 6.1 дюйма, камерой 48 Мп, память 128 ГБ	7	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
9	Кроссовки Nike	1.20	0.002000	18000.000	Одежда	25.00	Nike	Спортмагазин "Спортмастер"	Кроссовки Nike Air Max 270, размерная линейка 36-45, цвет черный/белый	16	шт.	https://avatars.mds.yandex.net/i?id=61ebe3ef6c8085aed5500285452f3536577163d9-11402781-images-thumbs&n=13
\.


--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routes (id, order_id, start_point, end_point, sending_time, delivery_time) FROM stdin;
\.


--
-- Data for Name: status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.status (id, status) FROM stdin;
1	принят
6	отменён
7	в пути
8	доставлен
2	ожидает сборки
3	собирается
4	готов к выдаче курьеру
5	передан курьеру
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, login, password_hash, client_id, courier_id, employee_id, is_active, created_at, last_login) FROM stdin;
5	manager2	$2b$10$ndqNkDdt/Phdt3jR4SCDCOgVQ19K.x582OpswROZuReUEUZQgsniG	\N	\N	5	t	2025-01-01 05:00:00	\N
6	operator3	$2b$10$rV6OIjg1IgjyrnnMg8HkmuxUYB/rHGS9wgipa5hhrD/R3m5wo5AtK	\N	\N	6	t	2025-01-01 05:00:00	\N
8	operator4	$2b$10$mK79P7JAtyYIwp/K2cUr8OgYbN6QYjruTfz2jN5molcJMrafbklpO	\N	\N	8	t	2025-01-01 05:00:00	\N
9	manager3	$2b$10$tgB2nVP8qcC7x8yxjwUovupX9mjzFkvkCAQSL8YTlor2RepKzZnya	\N	\N	9	t	2025-01-01 05:00:00	\N
10	operator5	$2b$10$3Of3LqTF.lgk.b6RoMSZUezlYN10SaZzn2SIcNlMGiRpKZoi2DGZa	\N	\N	10	t	2025-01-01 05:00:00	\N
11	admin3	$2b$10$oGgZK.QyrvU30agx7QSjLOS4Rzs27daJIqKZcDa0DLLVLWclzBnn6	\N	\N	11	t	2025-01-01 05:00:00	\N
12	operator6	$2b$10$vCIrei0V6Oouy.VRofXdteJbnz85CNRWD5n2p2lySw6eoXDVeSrEW	\N	\N	12	t	2025-01-01 05:00:00	\N
13	manager4	$2b$10$6jZ3RB6AR/AksajH.prbh.YI/SPTfiEKFGEqLqgbQIUkDrYkyghZG	\N	\N	13	t	2025-01-01 05:00:00	\N
14	operator7	$2b$10$TID.rwmoAu9Hk09PHM.TSOBLWRE0uL5Cfjc16ULu9ChZijnuKSPFi	\N	\N	14	t	2025-01-01 05:00:00	\N
15	admin4	$2b$10$89rbjJPOl5p4tedf7.za/OIpeE1J1drKnISX7J4K82ZHpJkbLtHFO	\N	\N	15	t	2025-01-01 05:00:00	\N
16	operator8	$2b$10$kP.y8Hh7LPdiCOz/9bbMw.2Gn3m8fczJ1.0kUWKAp7upKB46V42Yu	\N	\N	16	t	2025-01-01 05:00:00	\N
17	manager5	$2b$10$1XRCuRgTeBYCExaO8J9dzOmgGCt7PqG/gUwC/1DVScIcImljxj1G2	\N	\N	17	t	2025-01-01 05:00:00	\N
18	operator9	$2b$10$iS284VITJV5LX4ZfbfWePed3nOPCVwRCqr18mLO/YRld6OJl8TBzi	\N	\N	18	t	2025-01-01 05:00:00	\N
19	admin5	$2b$10$yJRZMw3ivybv54CivVKI4.QF8XdDCx3j.JUGSYorKV.CDFHvLy7sO	\N	\N	19	t	2025-01-01 05:00:00	\N
20	operator10	$2b$10$0WRzs1ebfQjxXTVQi6/P9umSKGEN2v7SlZh7hewNEWPaDZ7p.9E2q	\N	\N	20	t	2025-01-01 05:00:00	\N
22	client2	$2b$10$qlpXIqUAB/evKNrdkmIocOH2qikPqXz6kJVU3WpTKOXxX.WND3XAC	2	\N	\N	t	2025-01-01 05:00:00	\N
23	client3	$2b$10$oUAJUeXVCrI9PjfFfS8YOurcUcEuUWLd6Oj238LpbPG.6HLehj.eS	3	\N	\N	t	2025-01-01 05:00:00	\N
24	client4	$2b$10$JiGhQvYQSR3m0kZ2QCjdZOYCb/5gywOsUK7CXOse1rai.WhfN4wtu	4	\N	\N	t	2025-01-01 05:00:00	\N
25	client5	$2b$10$sp/rd4ncM6Kotk2PUaq7w.zS5oPDOX.4ExonW0/NgIxwK4SQQpeTK	5	\N	\N	t	2025-01-01 05:00:00	\N
26	client6	$2b$10$o73HvQLJPpAsGW2g9K74JeZ58o823NLS/1dIT03gEbuv7xm19P0Ei	6	\N	\N	t	2025-01-01 05:00:00	\N
27	client7	$2b$10$13AaVaYLtBy5RkG/j27el.lcroTAnJ5MEzl7huh3dYwgHBP7p3DaO	7	\N	\N	t	2025-01-01 05:00:00	\N
28	client8	$2b$10$/hqyxudymIN2BGDA4GSvjuQ3F7AuKWbR1OIaPfacNstHKRIRqY7My	8	\N	\N	t	2025-01-01 05:00:00	\N
29	client9	$2b$10$3FGha21Hbs.gVN3iSSmol.fr0BzpK4/ENd604BIKa0.zlljy8MEAm	9	\N	\N	t	2025-01-01 05:00:00	\N
30	client10	$2b$10$cXxUZmfJeCcPXn5HE3Js6.rt4X0d3ticJAEr1W4HGIfLAr0ZLleP2	10	\N	\N	t	2025-01-01 05:00:00	\N
31	client11	$2b$10$Fmu//mJ9JNH/hSouPtLEzOCnlp1V6t6pvpVVq0/70gZzuTXLxzNam	11	\N	\N	t	2025-01-01 05:00:00	\N
32	client12	$2b$10$X7chzPhFpzzuwcsKCqTZAOCjoq9prH0UE7d0kNCKuCOyOdo5cgVSK	12	\N	\N	t	2025-01-01 05:00:00	\N
33	client13	$2b$10$m/EdSCPoCaX6nQMFz79Ei.RaMX2.z8X/emP84drSpWquL0tgihaqO	13	\N	\N	t	2025-01-01 05:00:00	\N
35	client15	$2b$10$pFtQqnGHTcCUvnubORQimu2NPZFJ88r1AhiEE/TBAoOpXvOLHSaGy	15	\N	\N	t	2025-01-01 05:00:00	\N
36	client16	$2b$10$eXuMlqCcinG/bsndeu0x1.AMzNXXq7O2bzmXD.5ErRPZBu2ySOJI.	16	\N	\N	t	2025-01-01 05:00:00	\N
37	client17	$2b$10$4muArkGPXv7MueL3R8QES.tOi.1goP.ORL3.CyLiZBflLcL02tSnu	17	\N	\N	t	2025-01-01 05:00:00	\N
38	client18	$2b$10$J2rUA3ifap6MRnYAXHSM6.LZYl9PDuIxoXccKZxB8tNXEXsXrpcei	18	\N	\N	t	2025-01-01 05:00:00	\N
39	client19	$2b$10$95651NHWkoIB4/TYs/86FepNPMRkiD93ZBT6zZ1d0CiVFPxBG4No.	19	\N	\N	t	2025-01-01 05:00:00	\N
40	client20	$2b$10$/r1UaDTl85nlIgB.Gtp1DuLriz//IEsgVoLCRnwJqtPnGWowNiGIC	20	\N	\N	t	2025-01-01 05:00:00	\N
42	courier2	$2b$10$AEUMXczhJshHOuvUsaVbNuMEwwwyJiv43JKSF57XUV8e427ozxjJ6	\N	2	\N	t	2025-01-01 05:00:00	\N
43	courier3	$2b$10$i9Yf8hLSYKvEe/vfQbyAAOzThxgo0FrPQ9y3XVfVYbUnYei5qmiNe	\N	3	\N	t	2025-01-01 05:00:00	\N
44	courier4	$2b$10$0/0X7hQKXESni7sc8DopQ.Q0K0UH56.T5P257GPyHg.TIrrxWCi22	\N	4	\N	t	2025-01-01 05:00:00	\N
45	courier5	$2b$10$0Ht2FJ7AZj16Ba/PQG7lweblKOzsgQdYeDW431YfK7mzxXX6s/2Ei	\N	5	\N	t	2025-01-01 05:00:00	\N
46	courier6	$2b$10$GtPZfwfQ.w/RV54ts4ly2ugintEx.TtaYE77obpLnlCWvgAUcjhJu	\N	6	\N	t	2025-01-01 05:00:00	\N
47	courier7	$2b$10$CfUGYElDlenotcE6Qa0TIeopiwBSTC305VjS3VxqT1If/v5e9FxIC	\N	7	\N	t	2025-01-01 05:00:00	\N
48	courier8	$2b$10$0qwSm.gAnzmRX9z39S80HuILDrgxshQQhud2J9AYcKtu8Y91j8QWq	\N	8	\N	t	2025-01-01 05:00:00	\N
49	courier9	$2b$10$ot0Quo./HtszZJpPp5SJIObb/0gel3bsCw39svYjVL.qbx/76CRM.	\N	9	\N	t	2025-01-01 05:00:00	\N
50	courier10	$2b$10$0EAD3aBS3ee7hd7SlGCFLecModFP4Y6JXG4n1MbwzWQxh0VhQscuy	\N	10	\N	t	2025-01-01 05:00:00	\N
51	courier11	$2b$10$qlnwT/6nEquxsYj0gBGxUeHo0As/CKAT5lPR2U.84uQ1StM/MeXX2	\N	11	\N	t	2025-01-01 05:00:00	\N
52	courier12	$2b$10$kSfteNptGSqg1TADipPy0Otc8PUDoDBu.pL5BHkFOcrmcmzaQDvh6	\N	12	\N	t	2025-01-01 05:00:00	\N
53	courier13	$2b$10$TdQVL0Q/1IHs.2MFbXlEXejIMt7QTWHjKE2vNq39I1x7QggkisvWm	\N	13	\N	t	2025-01-01 05:00:00	\N
54	courier14	$2b$10$w21RKPzbYSQmXHfYjuJU.OdGurW1TJQ0yxoSy6pxQEdtbG9qbgWBi	\N	14	\N	t	2025-01-01 05:00:00	\N
55	courier15	$2b$10$YyMtMBKu2i95zolLgyFK5OZGZY4zXYVQ2XNbd3FXi/y8ZTAT3ou5O	\N	15	\N	t	2025-01-01 05:00:00	\N
56	courier16	$2b$10$2oOYXnz7GsqfJT4L72cGEuYEplvUuzjDKVNIbtFNOafBbEqiVHrgW	\N	16	\N	t	2025-01-01 05:00:00	\N
57	courier17	$2b$10$NXkH2n89Ls9MSYt2OWxL3OoSkD0ofCZpvj7XGVffmQXZNrhc4jsS.	\N	17	\N	t	2025-01-01 05:00:00	\N
58	courier18	$2b$10$Bqv5u1IsebntFGoR0rQgoe7UUO8G5xMzgLZoV6l.l06vwvQy2/D8O	\N	18	\N	t	2025-01-01 05:00:00	\N
59	courier19	$2b$10$8NK2ecDf.WnIpN3LqxqzDu0OON8.SPE9m.dSJwKb2ogqygtdESywa	\N	19	\N	t	2025-01-01 05:00:00	\N
60	courier20	$2b$10$gGVxVC83PcbqbDtXIt0nY.lyF8QO.oj7ewMJOgbvuU5qCT3MZ09OC	\N	20	\N	t	2025-01-01 05:00:00	\N
7	admin2	$2b$10$T4DFvKip128mmY2VJHwRe.UcN1CYOHtQeUsxi7mDXpBR6YZR6oAL.	\N	\N	7	t	2025-01-01 05:00:00	2025-12-25 20:24:37.904
2	manager	$2b$10$KCHZyig4OeYfwJXv5jrUeu5HP3sl5qRDveefU.DXWmH.HAYsS//Jm	\N	\N	2	t	2025-01-01 05:00:00	2025-12-25 20:25:55.684
4	operator2	$2b$10$jzbIfTJm63FfSy/2nczGn.GRS3mv2JGIL2hTSi4VJNXbDWrhOoT5W	\N	\N	4	t	2025-01-01 05:00:00	2025-12-25 20:24:57.031
21	client	$2b$10$F/dqdHpp5VMR9/Rq8t3wd.sI9cRl0X/5v6XYkk35g0/s8RRaucpX2	1	\N	\N	t	2025-01-01 05:00:00	2025-12-26 03:59:52.556
41	courier	$2b$10$8V9tckGM9Bl3ajAihyyLY.l30ES71LWE6GzojlpUdYuFam1UE5tTW	\N	1	\N	t	2025-01-01 05:00:00	\N
34	client14	$2b$10$.dXo5uFEvcFlB6iOKtAR4uoHmgWqRfUT3aS3/IFSkHl6ZU97LYGqO	14	\N	\N	t	2025-01-01 05:00:00	\N
3	operator	$2b$10$beeU/Pd9c/UifhHYamsmzuGZP/Ats6wy5HS7eqkI5Tzt9Zqy0IBjC	\N	\N	3	t	2025-01-01 05:00:00	2025-12-25 20:23:55.13
1	admin	$2b$10$eG/jWGPFeYjIUv8Ybn/v7ez7rtTXKtR3PV56NTl01GlA8XlN5UZai	\N	\N	1	f	2025-01-01 05:00:00	2025-12-25 21:23:23.848
62	KeKc	$2b$10$C1l5c8lbp0g2c11H3gBjIuUEDAMMjA/wZyvWGqnX7TjJwsT7t3BuS	22	\N	\N	t	2026-05-03 19:43:34.246927	\N
61	artem	$2b$10$APz5RtBnrANxjiZFORhcKOBrbDkurmz9xCQb0gQLA4r8cr5GGuXSW	21	\N	\N	t	2026-04-06 10:42:25.849499	\N
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, name, address, is_active) FROM stdin;
1	Основной склад	ул. Складская, 1	t
2	Запасной склад	пр-т Логистический, 15	t
\.


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 33, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 22, true);


--
-- Name: courier_phones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.courier_phones_id_seq', 1, false);


--
-- Name: couriers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.couriers_id_seq', 21, false);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 21, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 49, true);


--
-- Name: order_picking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_picking_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 34, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routes_id_seq', 1, false);


--
-- Name: status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.status_id_seq', 8, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 62, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 3, false);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- Name: clients clients_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_phone_key UNIQUE (phone);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: courier_phones courier_phones_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courier_phones
    ADD CONSTRAINT courier_phones_phone_number_key UNIQUE (phone_number);


--
-- Name: courier_phones courier_phones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courier_phones
    ADD CONSTRAINT courier_phones_pkey PRIMARY KEY (id);


--
-- Name: couriers couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_phone_key UNIQUE (phone);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_picking order_picking_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_picking
    ADD CONSTRAINT order_picking_pk PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_product_name_weight_kg_volume_m3_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_product_name_weight_kg_volume_m3_key UNIQUE (product_name, weight_kg, volume_m3);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: status status_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.status
    ADD CONSTRAINT status_pk PRIMARY KEY (id);


--
-- Name: users users_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_login_key UNIQUE (login);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: courier_phones courier_phones_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courier_phones
    ADD CONSTRAINT courier_phones_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE CASCADE;


--
-- Name: cart_items fk_cart_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items fk_cart_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT fk_cart_user FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders fk_orders_warehouse; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_warehouse FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_picking order_picking_employees_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_picking
    ADD CONSTRAINT order_picking_employees_fk FOREIGN KEY (operator_id) REFERENCES public.employees(id);


--
-- Name: order_picking order_picking_orders_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_picking
    ADD CONSTRAINT order_picking_orders_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: orders orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: orders orders_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id);


--
-- Name: orders orders_status_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_status_fk FOREIGN KEY (status_id) REFERENCES public.status(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: routes routes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: users users_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: users users_courier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_courier_id_fkey FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE CASCADE;


--
-- Name: users users_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict tZPsCTOHr8apgjUElncTxlQxrTSjFD2Lt9fhnlqbN9tVJKFTJub6dLWBpnQVb5l

