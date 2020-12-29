using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text.RegularExpressions;

using ASC.Common.Logging;

using Google.Protobuf;

using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace ASC.Common.Caching
{
    public interface ICustomSer<T> where T : IMessage<T>
    {
        void CustomSer();
        void CustomDeSer();
    }

    [Scope]
    public class DistributedCache<T> where T : IMessage<T>, ICustomSer<T>, new()
    {
        private ILog Log { get; set; }
        public readonly IDistributedCache cache;
        public readonly IDictionary<string, T> cache1;

        public DistributedCache(IDistributedCache cache, IOptionsMonitor<ILog> options)
        {
            this.cache = cache;
            Log = options.Get("ASC.Web.Api");
            Log.Info("DistributedCache loaded.");
            cache1 = new Dictionary<string, T>();
        }

        public T Get(string key) 
        {
            Stopwatch sw = new Stopwatch();
            sw.Start();

            if (cache1.ContainsKey(key))
            {
                return cache1[key];
            }

            var binatyData = cache.Get(key);

            if (binatyData != null)
            {
                try
                {
                    Stopwatch sw1 = new Stopwatch();
                    sw1.Start();

                    var parser = new MessageParser<T>(() =>new T());

                    var result = parser.ParseFrom(binatyData);
                    result.CustomDeSer();

                    cache1.Add(key, result);
                    sw1.Stop();
                    Log.Info($"DistributedCache: Key {key} parsed in {sw1.Elapsed.TotalMilliseconds} ms.");

                    sw.Stop();
                    Log.Info($"DistributedCache: Key {key} found in {sw.Elapsed.TotalMilliseconds} ms.");

                    return result;
                }
                catch(Exception ex)
                {
                    Log.Error(ex);

                    sw.Stop();
                    Log.Info($"DistributedCache: Key {key} rised Exception in {sw.Elapsed.TotalMilliseconds} ms.");

                    return default;
                }
            }

            sw.Stop();
            Log.Info($"DistributedCache: Key {key} not found in {sw.Elapsed.TotalMilliseconds} ms.");
            return default;
        }

        public byte[] GetClean(string key)
        {
            return cache.Get(key);
        }

        public void Insert(string key, T value, TimeSpan sligingExpiration)
        {
            Stopwatch sw = new Stopwatch();
            sw.Start();
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                SlidingExpiration = sligingExpiration
            };

            try
            {
                var parser = new MessageParser<T>(() => new T());
                value.CustomSer();
                cache.Set(key, value.ToByteArray(), opt);
            }
            catch (Exception ex)
            {
                Log.Error(ex);
            }
            sw.Stop();
            Log.Info($"DistributedCache: Key {key} Insert in {sw.Elapsed.TotalMilliseconds} ms.");
        }

        public void Insert(string key, T value, DateTime absolutExpiration)
        {
            Stopwatch sw = new Stopwatch();
            sw.Start();
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                AbsoluteExpiration = absolutExpiration
            };

            try
            {
                value.CustomSer();
                cache.Set(key, value.ToByteArray(), opt);
            }
            catch (Exception ex)
            {
                Log.Error(ex);
            }

            sw.Stop();
            Log.Info($"DistributedCache: Key {key} Insert in {sw.Elapsed.TotalMilliseconds} ms.");
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
