using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using ASC.Common.Logging;
using Google.Protobuf;
using Confluent.Kafka;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using System.Runtime.Serialization.Formatters.Binary;
using System.IO;
using System.Reflection;


namespace ASC.Common.Caching
{
    [Singletone]
    public class DistributedCache
    {
        private ILog Log { get; set; }
        public readonly IDistributedCache cache;

        public DistributedCache(IDistributedCache cache, IOptionsMonitor<ILog> options)
        {
            this.cache = cache;
            Log = options.Get("ASC.Web.Api");
            Log.Info("DistributedCache loaded");
        }

        public T Get<T>(string key) where T : IMessage<T>, new()
        {
            var binatyData=cache.Get(key);

            if (binatyData == null)
            {
                Log.Error($"DistributedCache: No Data with key ->{key}");
                return default;
            }
            else
            {
                try
                {
                    var parser = new MessageParser<T>(() => new T());
                    return parser.ParseFrom(binatyData);
                }
                catch(Exception ex)
                {
                    Log.Error(ex);
                    return default;
                }
            }
        }
        public byte[] Get(string key)
        {
            return cache.Get(key);
        }

        public void Insert<T>(string key, T value, TimeSpan sligingExpiration) where T : IMessage<T>, new()
        {
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                SlidingExpiration = sligingExpiration
            };

            try
            {
                cache.Set(key, value.ToByteArray(), opt);
            }
            catch (Exception ex)
            {
                Log.Error(ex);
            }
        }

        public void Insert<T>(string key, T value, DateTime absolutExpiration) where T : IMessage<T>, new()
        {
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                 AbsoluteExpiration= absolutExpiration
            };

            using (MemoryStream memoryStream = new MemoryStream())
            {
                try
                {
                    cache.Set(key, value.ToByteArray(), opt);
                }
                catch (Exception ex)
                {
                    Log.Error(ex);
                }
            }
        }
        public void Insert(string key, byte[] value, TimeSpan sligingExpiration)
        {
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                SlidingExpiration = sligingExpiration
            };

            try
            {
                cache.Set(key, value, opt);
            }
            catch (Exception ex)
            {
                Log.Error(ex);
            }
        }

        public void Insert(string key, byte[] value, DateTime absolutExpiration)
        {
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                AbsoluteExpiration = absolutExpiration
            };
            try
            {
                cache.Set(key, value, opt);
            }
            catch (Exception ex)
            {
                Log.Error(ex);
            }
        }        
        public void Remove(string key)
        {
            cache.Remove(key);
        }

        public void Remove(Regex pattern)
        {
            throw new NotImplementedException();
        }
    }
}
