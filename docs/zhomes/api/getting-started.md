---
description: Get started using the zHomes API.
---

# Getting Started

## Declare zHomes dependency in your build files

### Maven

```xml
<repositories>
    <repository>
        <id>yl3oft-repo</id>
        <url>https://repo.codemc.io/repository/yl3oft/</url>
    </repository>
</repositories>

<dependencies>
    <dependency>
        <groupId>me.yleoft</groupId>
        <artifactId>zHomes</artifactId>
        <version>3.0.1</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

### Gradle

```gradle
repositories {
    maven("https://repo.codemc.io/repository/yl3oft/")
}

dependencies {
    compileOnly("me.yleoft:zHomes:3.0.1")
}
```
