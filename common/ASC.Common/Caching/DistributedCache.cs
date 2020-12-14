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


namespace ASC.Common.Caching
{
    public class DistributedCache : ICache 
    {
        private ILog Log { get; set; }

        private BinaryFormatter formatter = new BinaryFormatter();

        public readonly IDistributedCache cache;

        public DistributedCache(IDistributedCache cache, IOptionsMonitor<ILog> options)
        {
            this.cache = cache;
            Log = options.Get("ASC.Web.Api");
            Console.WriteLine($"DistributedCache Create.  ");
        }
        public T Get<T>(string key)  where T : class 
        {
            var binatyData=cache.Get(key);
            if (binatyData == null)
            {
                Console.WriteLine($"DistributedCache. Get ({key}) No data.");
                return null;
            }
            else
            {
                try
                {
                    var TData = formatter.Deserialize(new MemoryStream(binatyData)) as T;
                    return TData;
                }
                catch(Exception ex)
                {
                    Log.Error(ex);
                    return null;
                }
            }
        }

        public T HashGet<T>(string key, string field)
        {
            Console.WriteLine("DistributedCache NotImplementedException");
            throw new NotImplementedException();
        }

        public ConcurrentDictionary<string, T> HashGetAll<T>(string key)
        {
            Console.WriteLine("DistributedCache NotImplementedException");
            throw new NotImplementedException();
        }

        public void HashSet<T>(string key, string field, T value)
        {
            Console.WriteLine("DistributedCache NotImplementedException");
            throw new NotImplementedException();
        }

        public void Insert(string key, object value, TimeSpan sligingExpiration)
        {

            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions() 
            { 
                SlidingExpiration = sligingExpiration 
            };
            using (MemoryStream memoryStream = new MemoryStream())
            {
                try
                {
                    formatter.Serialize(memoryStream, value);
                }
                catch (Exception ex)
                {
                    Log.Error(ex);
                }
                cache.Set(key, memoryStream.ToArray(), opt);
            }   
        }

        public void Insert(string key, object value, DateTime absolutExpiration)
        {
            Console.WriteLine($"DistributedCache Insert({key}):");
            Console.WriteLine(value);
            DistributedCacheEntryOptions opt = new DistributedCacheEntryOptions()
            {
                 AbsoluteExpiration= absolutExpiration
            };
            using (MemoryStream memoryStream = new MemoryStream())
            {
                try
                {
                    formatter.Serialize(memoryStream, value);
                }
                catch (Exception ex)
                {
                    Log.Error(ex);
                }
                cache.Set(key, memoryStream.ToArray(), opt);
            }
        }

        public void Remove(string key)
        {
            Console.WriteLine($"DistributedCache Remove({key})");
            cache.Remove(key);
        }

        public void Remove(Regex pattern)
        {
            throw new NotImplementedException();
        }
    }
}
