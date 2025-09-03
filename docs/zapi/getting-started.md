---
description: Get started using the zAPI API.
---

# Getting Started

## Declare zAPI dependency in your build files

{% hint style="info" %}
The dependency is published on [Maven Central](https://mvnrepository.com/repos/central), meaning you don't need to parse the repository.
{% endhint %}

### Maven

<pre class="language-xml"><code class="lang-xml">&#x3C;build>
    &#x3C;defaultGoal>clean package&#x3C;/defaultGoal>
    &#x3C;plugins>
        &#x3C;plugin>
            &#x3C;groupId>org.apache.maven.plugins&#x3C;/groupId>
            &#x3C;artifactId>maven-shade-plugin&#x3C;/artifactId>
            &#x3C;version>3.5.3&#x3C;/version>
            &#x3C;executions>
                &#x3C;execution>
                    &#x3C;phase>package&#x3C;/phase>
                    &#x3C;goals>
                        &#x3C;goal>shade&#x3C;/goal>
                    &#x3C;/goals>
                    &#x3C;configuration>
                        &#x3C;relocations>
                            &#x3C;relocation>
                                &#x3C;pattern>me.yleoft.zAPI&#x3C;/pattern>
                                &#x3C;shadedPattern>your.package.shaded.zAPI&#x3C;/shadedPattern>
                            &#x3C;/relocation>
                        &#x3C;/relocations>
                    &#x3C;/configuration>
                &#x3C;/execution>
            &#x3C;/executions>
        &#x3C;/plugin>
    &#x3C;/plugins>
&#x3C;/build>

&#x3C;repositories>
    &#x3C;repository>
        &#x3C;id>yl3oft-repo&#x3C;/id>
        &#x3C;url>https://repo.codemc.io/repository/yl3oft/&#x3C;/url>
    &#x3C;/repository>
&#x3C;/repositories>
<strong>
</strong><strong>&#x3C;dependencies>
</strong>    &#x3C;dependency>
        &#x3C;groupId>me.yleoft&#x3C;/groupId>
        &#x3C;artifactId>zAPI&#x3C;/artifactId>
        &#x3C;version>1.4.8&#x3C;/version>
        &#x3C;scope>compile&#x3C;/scope>
    &#x3C;/dependency>
&#x3C;/dependencies>
</code></pre>

{% hint style="warning" %}
maven-shade-plugin from org.apache.maven.plugins is used to relocate the package of the API, you can use it without relocating, but it may cause some incompatibilities.
{% endhint %}

### Gradle

```gradle
plugins {
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

repositories {
    maven("https://repo.codemc.io/repository/yl3oft/")
}

dependencies {
    implementation("me.yleoft:zAPI:1.4.8")
}

shadowJar {
    relocate 'me.yleoft.zAPI', 'your.package.shaded.zAPI'
}
```

{% hint style="warning" %}
shadowJar from com.github.johnrengelman.shadow is used to relocate the package of the API, you can use it without relocating, but it may cause some incompatibilities.
{% endhint %}
