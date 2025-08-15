---
description: Get started using the zTPA API.
---

# Getting Started

## Declare zTPA dependency in your build files

{% hint style="info" %}
The dependency is published on [Maven Central](https://mvnrepository.com/repos/central), meaning you don't need to parse the repository.
{% endhint %}

### Maven

```xml
<dependencies>
    <dependency>
        <groupId>me.yleoft</groupId>
        <artifactId>zTPA</artifactId>
        <version>1.0.2</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

### Gradle

```gradle
dependencies {
    compileOnly("me.yleoft:zTPA:1.0.2")
}
```
