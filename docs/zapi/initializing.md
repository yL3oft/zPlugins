---
description: How to initialize your plugin with zAPI
---

# Initializing

## Raw initialization

To initilize your plugin with zAPI you will need to call zAPI's init function:

{% hint style="info" %}
Keep in mind that a lot of features require NBTAPI to work, so if you really want to access 100% of zAPI's content, use [#initialization-with-nbtapi](initializing.md#initialization-with-nbtapi "mention")
{% endhint %}

```java
package me.yleoft.example;

import me.yleoft.zAPI.zAPI;
import org.bukkit.plugin.java.JavaPlugin;

public final class Main extends JavaPlugin {

    @Override
    public void onLoad() {
        zAPI.setPlugin(this);
        logger = new Logger("[" + getPluginMeta().getDescription() + "]");
        zAPI.setPluginLogger(logger);
        zAPI.preload(this);
    }
    
    @Override
    public void onEnable() {
        zAPI.init(this);
    }
    
    @Override
    public void onDisable() {
        zAPI.disable();
    }

}
```

## Initialization with NBTAPI

So if you want to access everything zAPI has to offer, you will need to use NBTAPI, and i highly recommend you to use it shaded in your plugin, just like zAPI.

After you got NBTAPI setup, change this line from [#raw-initialization](initializing.md#raw-initialization "mention"):

```java
zAPI.init(this);
```

To this:

```java
zAPI.init(this, NBT.preloadApi());
```
