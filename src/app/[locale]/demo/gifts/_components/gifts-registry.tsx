"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Heart,
  Search,
  Filter,
  Share2,
  Gift,
  Check,
  Wallet,
  ChevronDown,
  ChevronUp,
  Info,
  Shield,
  Zap,
  Users,
} from "lucide-react"

interface GiftItem {
  id: string
  name: string
  description: string
  price: number | null
  image: string
  category: string
  purchased: boolean
  purchasedBy?: string
  isCashGift?: boolean
}

const mockGifts: GiftItem[] = [
  {
    id: "cash-gift",
    name: "Custom Cash Gift",
    description: "Send any amount directly to the couple with a personal message",
    price: null,
    image: "/elegant-gold-gift-card-with-heart-design.png",
    category: "Cash Gift",
    purchased: false,
    isCashGift: true,
  },
  {
    id: "1",
    name: "KitchenAid Stand Mixer",
    description: "Professional 5-quart stand mixer in classic white",
    price: 299.99,
    image: "/kitchenaid-stand-mixer.png",
    category: "Kitchen",
    purchased: false,
  },
  {
    id: "2",
    name: "Egyptian Cotton Sheet Set",
    description: "Luxurious 800-thread count sheets in ivory",
    price: 189.99,
    image: "/luxury-bed-sheets.png",
    category: "Bedroom",
    purchased: true,
    purchasedBy: "Aunt Sarah",
  },
  {
    id: "3",
    name: "Cast Iron Dutch Oven",
    description: "7-quart enameled cast iron Dutch oven",
    price: 249.99,
    image: "/cast-iron-dutch-oven.png",
    category: "Kitchen",
    purchased: false,
  },
  {
    id: "4",
    name: "Wedding Photo Album",
    description: "Leather-bound photo album with gold embossing",
    price: 89.99,
    image: "/wedding-photo-album.png",
    category: "Keepsakes",
    purchased: false,
  },
  {
    id: "5",
    name: "Wine Decanter Set",
    description: "Crystal decanter with four matching glasses",
    price: 159.99,
    image: "/crystal-wine-decanter.png",
    category: "Dining",
    purchased: false,
  },
  {
    id: "6",
    name: "Bamboo Cutting Board Set",
    description: "Set of three bamboo cutting boards with juice grooves",
    price: 79.99,
    image: "/bamboo-cutting-board-set.png",
    category: "Kitchen",
    purchased: true,
    purchasedBy: "Mom & Dad",
  },
]

const categories = ["All", "Cash Gift", "Kitchen", "Bedroom", "Dining", "Keepsakes"]

export function GiftRegistry() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [gifts] = useState<GiftItem[]>(mockGifts)
  const [customAmount, setCustomAmount] = useState("")
  const [giftMessage, setGiftMessage] = useState("")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [personalMessages, setPersonalMessages] = useState<Record<string, string>>({})
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [howItWorksModalOpen, setHowItWorksModalOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch =
      gift.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gift.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || gift.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleCardExpansion = (giftId: string) => {
    setExpandedCard(expandedCard === giftId ? null : giftId)
  }

  const handlePersonalMessageChange = (giftId: string, message: string) => {
    setPersonalMessages((prev) => ({ ...prev, [giftId]: message }))
  }

  const handleCopyLink = async () => {
    const registryUrl = `${window.location.origin}/registry/sarah-michael-2024`
    try {
      await navigator.clipboard.writeText(registryUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-br from-card/95 via-card/85 to-muted/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 border-b border-border/30 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent via-50% to-accent/10 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/3 via-60% to-transparent" />
        <div className="relative z-10 container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-sm animate-pulse" />
                <Heart className="relative h-8 w-8 text-primary fill-primary drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground drop-shadow-sm">Sarah & Michael's Registry</h1>
                <p className="text-sm text-muted-foreground">Wedding Date: June 15, 2024</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={howItWorksModalOpen} onOpenChange={setHowItWorksModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-card/80 to-muted/80 backdrop-blur-sm border-border/50 hover:from-card/90 hover:to-muted/90 transition-all duration-300"
                  >
                    <Info className="h-4 w-4" />
                    How It Works
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                  <div className="relative z-10">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-xl text-foreground drop-shadow-sm">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-sm" />
                          <Info className="relative h-6 w-6 text-primary" />
                        </div>
                        How Our Digital Registry Works
                      </DialogTitle>
                      <DialogDescription className="text-pretty text-muted-foreground text-base">
                        Experience the future of wedding registries with secure, flexible digital gifts powered by
                        blockchain technology, through Stellar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 mt-6">
                      <div className="grid gap-4">
                        <div className="relative p-4 bg-muted/50 rounded-lg border border-border/40 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
                          <div className="relative z-10 flex items-start gap-3">
                            <div className="relative mt-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full blur-sm" />
                              <Gift className="relative h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">1. Choose Your Perfect Gift</h4>
                              <p className="text-sm text-muted-foreground">
                                Browse our curated registry and select the perfect gift for the couple. Each item is
                                represented as a unique digital token.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative p-4 bg-muted/50 rounded-lg border border-border/40 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent/5" />
                          <div className="relative z-10 flex items-start gap-3">
                            <div className="relative mt-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-accent/15 to-primary/15 rounded-full blur-sm" />
                              <Shield className="relative h-5 w-5 text-accent" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">2. Secure Blockchain Transaction</h4>
                              <p className="text-sm text-muted-foreground">
                                Your purchase is processed through secure blockchain technology, through Stellar. 
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative p-4 bg-muted/50 rounded-lg border border-border/40 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
                          <div className="relative z-10 flex items-start gap-3">
                            <div className="relative mt-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/15 rounded-full blur-sm" />
                              <Wallet className="relative h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">3. Token Transfer to Couple</h4>
                              <p className="text-sm text-muted-foreground">
                                Digital tokens representing your gift are instantly transferred to the couple's secure
                                wallet, along with your personal message. 
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative p-4 bg-muted/50 rounded-lg border border-border/40 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent/5" />
                          <div className="relative z-10 flex items-start gap-3">
                            <div className="relative mt-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-accent/15 to-primary/15 rounded-full blur-sm" />
                              <Zap className="relative h-5 w-5 text-accent" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground mb-2">4. Flexible Redemption</h4>
                              <p className="text-sm text-muted-foreground">
                                The couple can redeem tokens for the actual items, exchange them for other products, or
                                use them however they prefer, even cash them out - ultimate flexibility!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative p-5 bg-primary/5 rounded-lg border border-primary/15 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-sm" />
                              <Users className="relative h-5 w-5 text-primary" />
                            </div>
                            <h4 className="font-semibold text-foreground">Why Choose Blockchain Registry?</h4>
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-2">
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                              <span>
                                <strong className="text-foreground">Complete Transparency:</strong> All transactions are publicly verifiable
                              </span>
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
                              <span>
                                <strong className="text-foreground">Ultimate Flexibility:</strong> Couples can use gifts exactly how they want
                              </span>
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                              <span>
                                <strong className="text-foreground">Secure & Permanent:</strong> Blockchain ensures gifts go directly to the couple's wallet
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-card/80 to-muted/80 backdrop-blur-sm border-border/50 hover:from-card/90 hover:to-muted/90 transition-all duration-300"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Registry
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                  <div className="relative z-10">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3 text-xl text-foreground drop-shadow-sm">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-sm" />
                          <Share2 className="relative h-6 w-6 text-primary" />
                        </div>
                        Share Registry
                      </DialogTitle>
                      <DialogDescription className="text-pretty text-muted-foreground">
                        Share this registry with friends and family to help celebrate Sarah & Michael's special day!
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/30">
                          <Gift className="h-5 w-5 text-primary flex-shrink-0" />
                          <p className="text-sm text-foreground font-medium">Pick a gift you love for the couple</p>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/30">
                          <Wallet className="h-5 w-5 text-accent flex-shrink-0" />
                          <p className="text-sm text-foreground font-medium">It becomes a digital token in their wallet</p>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/30">
                          <Heart className="h-5 w-5 text-primary flex-shrink-0" />
                          <p className="text-sm text-foreground font-medium">They can use it however they want!</p>
                        </div>
                      </div>

                      <div className="relative p-4 bg-primary/5 rounded-lg border border-primary/15">
                        <p className="text-sm text-muted-foreground text-center">
                          <strong className="text-foreground">Why it's awesome:</strong> No duplicates, completely
                          secure, and the couple gets total flexibility with their gifts 🎁
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground text-center">Share this registry:</p>
                        <Button
                          onClick={handleCopyLink}
                          className="w-full"
                          variant="outline"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Link Copied!
                            </>
                          ) : (
                            <>
                              <Share2 className="h-4 w-4 mr-2" />
                              Copy Registry Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="relative mt-3 p-3 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded-lg border border-border/40 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent animate-pulse" />
            <div className="relative z-10">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xs" />
                  <Wallet className="relative h-3 w-3" />
                </div>
                Gifts are secured as digital tokens and transferred directly to the couple's wallet upon purchase
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative container mx-auto px-4 py-8">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/2 to-transparent pointer-events-none" />
        <div className="relative z-10">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gradient-to-r from-card/80 to-muted/80 backdrop-blur-sm border-border/50 hover:from-card/90 hover:to-muted/90 transition-all duration-300"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`gap-2 transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-primary/95 to-primary shadow-lg"
                      : "bg-gradient-to-r from-card/70 to-muted/70 backdrop-blur-sm border-border/50 hover:from-card/80 hover:to-muted/80"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Gift Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGifts.map((gift) => (
              <Card
                key={gift.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card/95 to-muted/95 backdrop-blur-sm border-border/50 hover:border-border/70"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  <img src={gift.image || "/placeholder.svg"} alt={gift.name} className="w-full h-48 object-cover" />
                  {gift.purchased && (
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant="secondary"
                        className="bg-gradient-to-r from-secondary/90 to-secondary backdrop-blur-sm shadow-lg"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Gifted
                      </Badge>
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className="absolute top-2 left-2 bg-gradient-to-r from-card/90 to-muted/90 backdrop-blur-sm border-border/50"
                  >
                    {gift.category}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg text-balance">{gift.name}</CardTitle>
                  <CardDescription className="text-pretty">{gift.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {gift.isCashGift ? (
                    <div className="space-y-3">
                      <div>
                        <Input
                          type="number"
                          placeholder="Enter amount ($)"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="Add a personal message..."
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-primary mb-2">${gift.price?.toFixed(2)}</div>
                      {gift.purchased && gift.purchasedBy && (
                        <p className="text-sm text-muted-foreground">Gifted by {gift.purchasedBy}</p>
                      )}
                    </>
                  )}
                </CardContent>
                {!gift.isCashGift && expandedCard === gift.id && (
                  <div className="px-6 pb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="border-t border-border pt-4">
                      <Textarea
                        placeholder="Add a personal message for the couple..."
                        value={personalMessages[gift.id] || ""}
                        onChange={(e) => handlePersonalMessageChange(gift.id, e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                )}
                <CardFooter className="flex flex-col gap-2">
                  {gift.purchased ? (
                    <Button disabled className="w-full bg-transparent" variant="outline">
                      <Check className="h-4 w-4 mr-2" />
                      Already Gifted
                    </Button>
                  ) : gift.isCashGift ? (
                    <Button
                      className="w-full"
                      size="sm"
                      disabled={!customAmount || Number.parseFloat(customAmount) <= 0}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Send ${customAmount || "0"} Gift
                    </Button>
                  ) : (
                    <>
                      <Button className="w-full" size="sm" onClick={() => toggleCardExpansion(gift.id)}>
                        <Gift className="h-4 w-4 mr-2" />
                        Gift This Item
                        {expandedCard === gift.id ? (
                          <ChevronUp className="h-4 w-4 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                      {expandedCard === gift.id && (
                        <Button variant="default" className="w-full" size="sm">
                          <Wallet className="h-4 w-4 mr-2" />
                          Confirm Gift
                        </Button>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {filteredGifts.length === 0 && (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No gifts found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="relative border-t border-border/30 bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-pulse" />
        <div className="relative z-10 container mx-auto px-4 py-6">
          <div className="text-center text-xs text-muted-foreground">
            <p>Powered by blockchain technology • Secure digital gift transfers</p>
            <p className="mt-1">© 2024 Wedding Registry Platform</p>
          </div>
        </div>
      </footer>
    </div>
  )
}