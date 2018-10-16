
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using System.Web;
using System.IO;

namespace Elements
{
    public class RawHtml {
        private string text;

        public RawHtml(string text) {
            this.text = text;
        }

        public override string ToString() {
            return text;
        }
    }

    public class Slot {
        public string Id {get; private set;}
        public string Content {get; private set;}

        public Slot(string id, string content) {
            this.Id = id;
            this.Content = content;
        }
    }

    public abstract class CustomElement
    {
        protected abstract string Selector { get; }
        protected virtual Hashtable Css { get; }

        protected abstract string[] CustomAttributes { get; }

        protected Hashtable attributes = new Hashtable();
        
        private List<Slot> slots = new List<Slot>();
        private string elementId = Guid.NewGuid().ToString();

        public virtual IEnumerable<object> Render()
        {
            return new List<object>();
        }

        protected IEnumerable<R> Map<T, R>(IEnumerable<T> array, Func<T, decimal, R> callback)
        {
            return array.Select((item, index) => callback(item, Convert.ToDecimal(index)));
        }

        protected RawHtml Raw(object text) {
            return new Elements.RawHtml(text.ToString());
        }

        private string CreateAttributeString(Hashtable attributes = null, CustomElement element = null)
        {
            var attributeString = "";

            if (attributes == null)
            {
                return attributeString;
            }

            foreach (var key in attributes.Keys)
            {
                var val = attributes[key];

                if ((string)key == "ref")
                {
                    val = $"{this.elementId}.{val}";
                }

                var type = val.GetType();

                if (type == typeof(Boolean))
                {
                    if ((bool)val)
                    {
                        attributeString += $" {key}";
                    }
                }
                else if (element != null)
                {
                    if ((string)key == "ref" || (string)key == "class" || (string)key == "id")
                    {
                        attributeString += $" {key}=\"{val}\"";
                    }
                    else if (element.CustomAttributes.Contains(key))
                    {
                        val = JsonConvert.SerializeObject(val, new JsonSerializerSettings
                        {
                            StringEscapeHandling = StringEscapeHandling.EscapeHtml
                        });
                        attributeString += $" {key}={HttpUtility.HtmlEncode(val)}";
                    }
                }
                else
                {
                    attributeString += $" {key}=\"{val}\"";
                }
            }
            return attributeString;
        }

        private string ProcessChildren(IEnumerable<object> children)
        {
            string content = "";

            foreach (var child in children)
            {
                if (child == null)
                {
                    continue;
                }
                else if (child is string)
                {
                    content += HttpUtility.HtmlEncode((string)child);
                }
                else if (child is IEnumerable<object>)
                {
                    content += this.ProcessChildren(child as IEnumerable<object>);
                }
                else if (child is Slot) {
                    content += this.slots.First(s => s.Id == ((Slot)child).Id).Content;
                }
                else
                {
                    content += child.ToString();
                }
            }

            return content;
        }

        public object CreateElement(string element, Hashtable attributes = null, params object[] children)
        {
            string content = ProcessChildren(children);

            if(element == "slot") {
                if(attributes == null || attributes["id"]== null) {
                    throw new Exception("Slots need an id");
                }

                return new Slot((string)attributes["id"], content);
            }

            if (element != "input" && element != "br")
            {
                return this.Raw($"<{element}{CreateAttributeString(attributes)}>{content}</{element}>");
            }
            else
            {
                return this.Raw($"<{element}{CreateAttributeString(attributes)}/>");
            }
        }

        public object CreateElement(CustomElement element, Hashtable attributes = null, params object[] children)
        {
            element.attributes = attributes;

            foreach(var child in children) {
                if(child is Slot) {
                    element.slots.Add((Slot)child);
                }
            }

            return this.Raw($"<{element.Selector} element-id=\"{this.elementId}\"{CreateAttributeString(attributes, element)} ssr>{string.Join(null, element.Render())}</{element.Selector}>");
        }

        public override string ToString()
        {
            var attributeString = "";

            foreach (string attribute in this.CustomAttributes)
            {
                var val = this.attributes[attribute];

                if (val != null)
                {
                    val = JsonConvert.SerializeObject(val);
                    attributeString += $" {attribute}={ HttpUtility.HtmlEncode(val) }";
                }
            }

            return $"<{Selector} element-id=\"{this.elementId}\"{attributeString} ssr>{string.Join(null, this.Render())}</{Selector}>";
        }

        protected bool IsFalsy(object data)
        {
            if (data == null ||
               (data is string && (string)data == "") ||
               (data is decimal && (decimal)data == 0) ||
               (data is int && (int)data == 0) ||
               (data is bool && !(bool)data))
            {
                return true;
            }

            return false;
        }
    }
}