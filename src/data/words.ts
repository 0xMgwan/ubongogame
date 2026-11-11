// Kamusi ya Ubongo — curated Swahili lexicon (lowercase, a–z only).
// Expand freely: every game reads from LEXICON.

const RAW = `
mti mto jua kaa nzi mbu tai bei pua uzi taa saa mke mji bia ona oga uza lia vaa nje juu leo kwa mia uji ini jaa hai pia ila fua cha ana tia zaa kua nia ota oza oka uma ita iba lea paa nta ama una wao pole sasa maji kuku mama baba dada kaka bibi babu
moto joto chai embe wali nguo mkoba simu gari basi meli boti njia nchi taifa watu mtu kazi bado tena kila wote yote hodi poa leta weka toka rudi kata osha lipa tuma beba vuta gusa nusa onja anza piga soma imba pika lala enda sema taka jibu omba ruka
safi dawa homa afya saba nane tisa kumi tatu tano sita elfu laki pesa soko duka refu fupi mpya jana wiki siku pole meza kiti jiko kisu jani maua mawe jiwe nazi kobe paka mbwa bata papa ngao radi giza kiza taji
hewa ndoo kapu bafu choo soda nyanya dama sala dini deni kodi busu ndoa mume mzee hofu ziwa mvua mguu meno damu moyo kamba
simba tembo twiga ndege mbuzi mtoto shule barua dunia jambo mwezi nyota mlima pwani upepo ndizi papai ugali nyama mkate siagi pilau mboga tunda kiatu kofia shati kanga treni mgeni fundi sauti wimbo ngoma mpira amani imani akili ndoto fikra lugha ukuta moshi mkono jicho sikio mdomo ulimi tumbo ngozi mbili fedha benki ghali kubwa ndogo nzuri mbaya chafu kesho mwaka usiku jioni mbele nyuma chini ndani kando mbali kulia kweli uongo labda mambo panga jembe mbegu mtama viazi mnazi msitu nyasi chuma shaba nyoka punda panya njiwa nyuki mamba pweza dagaa ngisi picha rangi njano swali elimu chama ofisi faida nguvu bwana jamii cheza penda fanya cheka uliza shika funga ingia panda shuka choma nunua chora sikia ficha sahau amini ongea kuona kujua kukaa kuuza kuoga kuzaa mvuvi mwana mzazi nanga tanga bonde umeme ndugu jeshi pombe juisi chupa mfuko ngazi jengo redio video sanaa uzuri ujuzi uhuru umoja nguzo kalia tunza kiini hatua ishara mwili pamba asali bahari maziwa
kitabu habari rafiki safari asante karibu bahati sukari kahawa nanasi samaki baridi mjomba jirani askari dereva mpishi furaha upendo kalamu mlango sahani nywele kichwa rahisi mchana haraka shamba mchele mwembe jangwa almasi kiboko farasi ngamia kasuku buibui nyeupe nyeusi kijani darasa hesabu kanisa harusi zawadi hasara tajiri hodari shujaa jasiri hasira huzuni kijana kizazi kabila hekima kimbia tembea safiri fikiri shinda fungua sukuma tafuta maliza subiri kisima jahazi kilele ukungu mwanga mganga mtungi nyundo daraja uwanja hoteli chumba jikoni gazeti mchezo karata afrika kusoma kupika kulala kuamka kwenda kusema kutaka kupata kuomba kuruka kuimba kunywa mbinu sababu mwisho mwanzo kiongozi
chakula nyumba kitenge suruali kijiji serikali mwalimu daktari mkulima ushindi heshima dirisha kitanda kikombe kijiko sufuria zamani asubuhi kushoto hapana lakini kwaheri samahani hongera mahindi mchanga dhahabu nguruwe sungura kipepeo nyekundu kahawia mtihani historia sayansi msikiti sikukuu sherehe biashara mshahara maskini kicheko tabasamu mapenzi hadithi methali kumbuka pumzika zungumza bandari kiwanja nyumbani ghorofa runinga filamu bendera kucheza kupenda kufanya kucheka kuandika msumari sindano sanduku maharage theluji bunduki mvinyo kitambaa kioo
pasi kuni lami mpaka bara kipaji sifa tuzo kombe bingwa nyimbo fumbo neno maneno herufi akiba hazina mali bure ghafla polepole mwenzi mpenzi wanyama mnyama mimea mbingu nuru kisiwa kisasa ogelea kitendawili
`

export const LEXICON: string[] = Array.from(
  new Set(RAW.split(/\s+/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{3,9}$/.test(w)))
)
export const LEXSET = new Set(LEXICON)

// ---------- FUMBUA (5-letter daily word) ----------
export const FUMBUA_ANSWERS = LEXICON.filter(w => w.length === 5)

// ---------- MAFUMBO (crossword) word + Swahili clue ----------
export const CLUES: Record<string, string> = {
  simba: 'Mfalme wa pori', tembo: 'Mnyama mkubwa mwenye mkonga', twiga: 'Mwenye shingo ndefu kuliko wote',
  kiboko: 'Hulala majini mchana, hula nyasi usiku', ngamia: 'Meli ya jangwani', punda: 'Hubeba mizigo, hulia "hii-hoo"',
  nyoka: 'Hutambaa bila miguu', kasuku: 'Ndege anayeiga sauti za watu', mamba: 'Mnyama hatari wa mtoni mwenye meno mengi',
  pweza: 'Ana mikono minane baharini', samaki: 'Huogelea, hupikwa na wali pwani', nyuki: 'Hutengeneza asali',
  asali: 'Tamu inayotengenezwa na nyuki', njiwa: 'Ndege wa amani', kipepeo: 'Mdudu mwenye mabawa ya rangi',
  ugali: 'Chakula kikuu kutoka unga wa mahindi', pilau: 'Wali wenye viungo, sherehe hupenda', chai: 'Kinywaji cha moto cha asubuhi',
  kahawa: 'Kinywaji kichungu cha Kilimanjaro', ndizi: 'Tunda refu la njano', nanasi: 'Tunda lenye miiba na taji',
  embe: 'Tunda la msimu wa joto', nazi: 'Tunda la mnazi lenye maji', sukari: 'Huongeza utamu kwenye chai',
  mkate: 'Huokwa, huliwa na siagi', chakula: 'Tunachokula kila siku', mchele: 'Hupikwa kuwa wali',
  bahari: 'Maji mengi ya chumvi, Hindi ni mfano', ziwa: 'Victoria ni mfano wake', mto: 'Maji yanayotiririka, mfano Rufiji',
  mlima: 'Kilimanjaro ni mfano wake', jangwa: 'Mahali pa mchanga na ukame', kisiwa: 'Ardhi iliyozungukwa na maji, kama Unguja',
  pwani: 'Ufukwe wa bahari', jua: 'Huchomoza mashariki', mwezi: 'Huangaza usiku, siku thelathini', nyota: 'Hung\'aa angani usiku',
  mvua: 'Maji kutoka mawinguni', upepo: 'Hewa inayovuma', theluji: 'Barafu juu ya kilele cha Kibo',
  shule: 'Wanafunzi hujifunza hapa', mwalimu: 'Hufundisha darasani', daktari: 'Hutibu wagonjwa', kalamu: 'Chombo cha kuandikia',
  kitabu: 'Una kurasa nyingi za kusoma', darasa: 'Chumba cha masomo', mtihani: 'Hupima ulichojifunza',
  rafiki: 'Mwandani wako wa karibu', furaha: 'Hali ya moyo kufurahi', upendo: 'Hisia kuu ya moyoni', amani: 'Hali bila vita',
  uhuru: 'Tanganyika ilipata mwaka 1961', umoja: '___ ni nguvu, utengano ni udhaifu', hekima: 'Busara ya wazee',
  safari: 'Neno la Kiswahili lililoenea duniani', karibu: 'Neno la kumkaribisha mgeni', asante: 'Shukrani',
  jambo: 'Salamu maarufu kwa watalii', hodi: 'Husemwa mlangoni kabla ya kuingia', kwaheri: 'Neno la kuagana',
  nyumba: 'Mahali pa kuishi', mlango: 'Huingia kupitia hapa', dirisha: 'Huruhusu mwanga kuingia', kitanda: 'Hulala juu yake',
  meza: 'Huwekea sahani juu yake', kiti: 'Hukaliwa', sahani: 'Hupakulia chakula', kikombe: 'Hunywea chai',
  gari: 'Lina magurudumu manne', meli: 'Chombo kikubwa baharini', treni: 'Hupita kwenye reli', jahazi: 'Chombo cha tanga cha pwani',
  ngoma: 'Hupigwa kwenye sherehe', wimbo: 'Huimbwa', mpira: 'Huchezwa uwanjani', simu: 'Hupiga na kupokea',
  moto: 'Huwaka na kuchoma', maji: 'Uhai wa viumbe vyote', damu: 'Nyekundu, hupita mishipani', moyo: 'Hupiga ndani ya kifua',
  jicho: 'Huona', sikio: 'Husikia', mkono: 'Una vidole vitano', mguu: 'Hutembea nao', meno: 'Hutafuna chakula',
  ulimi: 'Huonja ladha', nywele: 'Huota kichwani', kichwa: 'Juu ya shingo',
  dhahabu: 'Madini ya njano yenye thamani', almasi: 'Jiwe linalong\'aa sana', fedha: 'Pesa au madini meupe',
  pesa: 'Hununulia vitu', soko: 'Kariakoo ni mfano', duka: 'Huuza bidhaa', benki: 'Huhifadhi pesa',
  kesho: 'Siku baada ya leo', jana: 'Siku kabla ya leo', usiku: 'Kinyume cha mchana', asubuhi: 'Mwanzo wa siku',
  jioni: 'Jua linapozama', haraka: '___ haraka haina baraka', polepole: 'Ndio mwendo', bahati: 'Kupata bila kutarajia',
  shamba: 'Mahali pa kulima', jembe: 'Chombo cha mkulima', mbegu: 'Hupandwa ardhini', mahindi: 'Hutoa unga wa ugali',
  mkulima: 'Hulima shamba', mvuvi: 'Huvua samaki', fundi: 'Mtaalamu wa kutengeneza vitu', askari: 'Hulinda usalama',
  mpishi: 'Hupika chakula', dereva: 'Huendesha gari', tajiri: 'Mwenye mali nyingi', maskini: 'Asiye na mali',
  harusi: 'Sherehe ya ndoa', zawadi: 'Hutolewa bila malipo', sikukuu: 'Siku ya kusherehekea', kanga: 'Vazi lenye methali',
  kofia: 'Huvaliwa kichwani', kiatu: 'Huvaliwa mguuni', shati: 'Vazi la juu lenye vifungo', kitenge: 'Kitambaa cha rangi za Afrika',
  rangi: 'Nyekundu, kijani au bluu', kijani: 'Rangi ya majani', njano: 'Rangi ya ndizi iliyoiva', nyeusi: 'Rangi ya giza',
  neno: 'Herufi zikiungana', lugha: 'Kiswahili ni mojawapo', methali: 'Usipoziba ufa utajenga ukuta, ni mfano', hadithi: 'Huanza "Paukwa..."',
  ndoto: 'Huiona ukilala', akili: 'Hufikiri', swali: 'Hujibiwa', jibu: 'Hutolewa kwa swali',
  kimbia: 'Enda kwa kasi sana', cheza: 'Fanya mchezo', cheka: 'Ha ha ha!', soma: 'Pitia maandishi', imba: 'Toa wimbo',
  pika: 'Andaa chakula jikoni', lala: 'Pumzika usiku', ruka: 'Panda hewani kwa miguu', ogelea: 'Enda majini kwa mikono na miguu',
  kubwa: 'Kinyume cha ndogo', ndogo: 'Kinyume cha kubwa', nzuri: 'Kinyume cha mbaya', safi: 'Bila uchafu', mpya: 'Kinyume cha zamani',
  refu: 'Kinyume cha fupi', baridi: 'Kinyume cha joto', kweli: 'Kinyume cha uongo', mbele: 'Kinyume cha nyuma',
  juu: 'Kinyume cha chini', ndani: 'Kinyume cha nje', bingwa: 'Mshindi wa mashindano', kombe: 'Hupewa bingwa',
  taji: 'Huvaliwa na mfalme', bendera: 'Ina rangi za taifa', taifa: 'Nchi na watu wake', hazina: 'Mali iliyofichwa',
  fumbo: 'Kitendawili kigumu', radi: 'Mlio baada ya umeme angani', umeme: 'Huwasha taa', giza: 'Hakuna mwanga',
}

// ---------- WINDO letter weights (approximate Swahili frequency) ----------
export const LETTER_WEIGHTS: [string, number][] = [
  ['a', 17], ['i', 10], ['u', 7], ['e', 4], ['o', 4], ['m', 6], ['n', 7], ['k', 6], ['w', 4], ['t', 4],
  ['h', 3], ['l', 3], ['s', 3], ['y', 3], ['z', 2], ['b', 2], ['d', 2], ['j', 2], ['g', 1.5], ['f', 1.5],
  ['p', 2], ['r', 2], ['c', 0.6], ['v', 0.8],
]

// Fun Swahili facts shown on loading/results
export const METHALI = [
  'Haba na haba hujaza kibaba.',
  'Bandu bandu huisha gogo.',
  'Asiyefunzwa na mamaye hufunzwa na ulimwengu.',
  'Mchelea mwana kulia hulia yeye.',
  'Penye nia pana njia.',
  'Akili ni nywele, kila mtu ana zake.',
  'Mstahimilivu hula mbivu.',
  'Kidole kimoja hakivunji chawa.',
  'Usipoziba ufa utajenga ukuta.',
  'Maji yakimwagika hayazoleki.',
]
