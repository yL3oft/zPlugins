---
description: Get started using the zHomes API.
---

# Getting Started

## Declare zHomes dependency in your build files

{% hint style="info" %}
The dependency is published on [Maven Central](https://mvnrepository.com/repos/central), meaning you don't need to parse the repository.
{% endhint %}

### Maven

```xml
<dependencies>
    <dependency>
        <groupId>me.yleoft</groupId>
        <artifactId>zTpa</artifactId>
        <version>1.0.0</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

### Gradle

```gradle
dependencies {
    compileOnly("me.yleoft:zTpa:1.0.0")
}
```
