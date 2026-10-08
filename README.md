# Service-Generator

## Description

This project is consisting of accelerating the initialization of a new project.<br>
Instead of having to go from scratch for a new project, we have template with common dependency to genertate the project<br>
It will permit for the developers to gain development time.

## Architectures Templates
### Hexagonal
In the Hexagonal Architecture, the Domain is in the center of everything
Remaining Thing (frameworks,Databases, API, UI Interfaces) should be outside the domain on the interface layer
```
        [ Client Web / REST ]
                 │
                 ▼
          ┌─────────────┐
          │   Adapter   │
          └──────┬──────┘
                 │
                 ▼
          ┌─────────────┐
          │   Driving   │  (Inbound / Driving)
   ┌──────┴─────────────┴──────┐
   │                           │
   │           DOMAIN          │  (Absolutely Pure: No Frameworks linked (Spring, JPA),nor external imports)
   │     (Entities, Rules)     │   
   │                           │
   └──────┬─────────────┬──────┘
          │    Driven   │  (Outbound / Driven)
          └──────┬──────┘
                 │
                 ▼
          ┌─────────────┐
          │   Adapter   │  (JPA/JDBC Implementation, SQL Client, Other Services)
          └──────┬──────┘   
                 │
                 ▼
         [ Database / API ]

```
**Principles**

> **The Core (Domain)** :<br>
> Contain the pure Business logic and entities, none of the dependency should be directed to external libraries or frameworks
>
> **The Ports (Interfaces)** :
> - Inbound (Driving) : Use Cases / Services are exposed outside 
> - Outbound (Driven) : Interfaces required by the Business Layer to work (ex: UserRepository).
>
> **Adapters** :
> - Incoming Adapters : Transform external request (REST controller) to inbound Call
> - Outcoming Adapters : Implements outbound interfaces to interact with the outside (JDBCRepositoryAdapter talking with Database) 


---

### Monolithic / 3 Layers

The traditional 3 Layer architecture structure the code in an verticaly descending manner. Dependency is up to down

```
   [ UI Layer / API ]  --> (Controllers REST, vues)
            │
            ▼
[ Business Layer / Service ] --> (Logique business)
            │
            ▼
 [ Database Access Layer ]   --> (Entities JPA, Repositories, SQL)
```

**Principles**
> **UI Layer** :<br>
> Receive HTTP/UI requests,check the entries and send it to the Business Layer.
>
> **Business Layer (Service)** : <br>
> Contain the company logic, but depend directly of the database layer to find or save elements.
>
> **Database Access (DAO/Repository)** : <br>
> Interact with Database or External Services.
>
> **Major limit** <br>
> The Business Layer is highly Database Layer dependent (and often of the persistance framework, like Hibernate/JPA)
> The database technology infect the Business Layer

### Comparison

| Critera                     | Hexagonal Architecture                | 3 Layers / Monolithic                                    |
|-----------------------------|---------------------------------------|----------------------------------------------------------|
| **Dependency**              | Dependency inversion                  | Top Down : Ui layer => Business Layer => Database layer  |
| **DB coupling / Framework** | None inside the domain                | High (Business entity annotated `@Entity` JPA            |
| **Business Testability**    | Often need of mocks or test DB like H2| Fast unit test with only Java/Kotlin without spring      |
| **Writing Complexity**      | Low ( Fast Developpement )            | High (More boilerplate, DTOs, mappers and interfaces)    |
| **Learning**                | Immediate for majority of developpers | Need of team rigor and IoC mastering                     |
| **Change of technology**    | Complex (everything is highly linked) | Without pain (Only need to change adapters)              |

### When using one or the other
**__3 Layers__**
> - Developping Simple CRUD, internal mainenance application or
> - For newcomers or the delivery time (Time to Market) is short (MVP)
> - Business Logic is minimal and only used to transfert data between Database and API

**__Hexagonal Architecture__**
> - High complexity Business logic, evolutive and strategic for company
> - Long term application, should support update and framework changes
> - DDD or TDD practice to isolate the Domain
> - Multiple incoming sources (API REST, Consumer Kafka/RabbitMQ) and outcoming (SQL DB, External API, Redis Cache)


## Installation & Run

To generate project you should have:
- node >= 14.6
- yaml ^2.9.1

If you aren't bothered by the package you should use  
```bash
node generator.js <template> <Project-Name>
```
or
```bash
npm run generate -- <template> <Project-Name>
```
with:
<br>
``<template>`` : The template that will be selected between hexagonal or 3 Layered Architecture
<br>
``<Project-Name>`` : The name of the project

the generated project will have `com.example` package by default 

If you have your own package you should use:
```bash
node generator.js <template> <Project-Name> <package.name>
```
or
```bash
npm run generate -- <template> <Project-Name> <package.name>
```
with:
<br>
``<template>`` : The template that will be selected between hexagonal or 3 Layered Architecture
<br>
``<Project-Name>`` : The name of the project
<br>
``<package.name>`` : The name of your package

> The project will be generated into the ``./out`` folder

After The generation, git will be initialised and the first commit will be done


