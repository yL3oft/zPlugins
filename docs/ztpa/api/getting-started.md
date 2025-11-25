---
description: Get started using the zTPA API.
---

# Getting Started

## Declare zTPA dependency in your build files

### Maven

<pre class="language-xml"><code class="lang-xml">&#x3C;repositories>
    &#x3C;repository>
        &#x3C;id>yl3oft-repo&#x3C;/id>
        &#x3C;url>https://repo.codemc.io/repository/yl3oft/&#x3C;/url>
    &#x3C;/repository>
&#x3C;/repositories>
<strong>
</strong><strong>&#x3C;dependencies>
</strong>    &#x3C;dependency>
        &#x3C;groupId>me.yleoft&#x3C;/groupId>
        &#x3C;artifactId>zTPA&#x3C;/artifactId>
        &#x3C;version>1.0.3&#x3C;/version>
        &#x3C;scope>provided&#x3C;/scope>
    &#x3C;/dependency>
&#x3C;/dependencies>
</code></pre>

### Gradle

```gradle
repositories {
    maven("https://repo.codemc.io/repository/yl3oft/")
}

dependencies {
    compileOnly("me.yleoft:zTPA:1.0.3")
}
```
